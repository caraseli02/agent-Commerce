import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { paymentStatuses } from '~/server/domain/payments/contracts';
import { checkoutWorkflowStatuses, paidRecoveryDecisions } from '~/server/application/checkout/contracts';
import { PlaceOrderError } from '~/server/application/checkout/place-order';
import { checkoutErrorData, checkoutErrorResponse } from '~/types/order/checkout-error';

// Syntax analysis guards production declarations, not SQL predicates, diagnostics, or fixtures.
const groups: readonly (readonly string[])[] = [paymentStatuses, checkoutWorkflowStatuses, paidRecoveryDecisions];
const containsBroadString = (type: ts.TypeNode | undefined): boolean =>
  Boolean(type && (type.kind === ts.SyntaxKind.StringKeyword || (ts.isUnionTypeNode(type) && type.types.some(containsBroadString))));
const violations = (file: string, text: string): string[] => {
  if (['server/domain/payments/contracts.ts', 'server/application/checkout/contracts.ts'].includes(file)) return [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const problems: string[] = [];
  const initializers = new Map<string, ts.Expression>();
  const collect = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      initializers.set(node.name.text, node.initializer);
    ts.forEachChild(node, collect);
  };
  collect(source);
  const containsPublicCode = (value: ts.Expression, seen = new Set<string>(), includeTypedProducer = false): boolean => {
    if (includeTypedProducer && ts.isCallExpression(value) && value.expression.getText(source) === 'checkoutErrorData') return true;
    if (ts.isIdentifier(value)) {
      if (seen.has(value.text)) return false;
      seen.add(value.text);
      const initializer = initializers.get(value.text);
      return initializer ? containsPublicCode(initializer, seen, includeTypedProducer) : false;
    }
    return (
      ts.isObjectLiteralExpression(value) &&
      value.properties.some(
        (property) =>
          (ts.isPropertyAssignment(property) && property.name.getText(source).replaceAll("'", '').replaceAll('"', '') === 'code') ||
          (ts.isSpreadAssignment(property) && containsPublicCode(property.expression, seen, includeTypedProducer)),
      )
    );
  };
  const visit = (node: ts.Node) => {
    if (ts.isTypeAliasDeclaration(node) || ts.isPropertySignature(node) || ts.isVariableDeclaration(node)) {
      const type = node.type;
      if (type && ts.isUnionTypeNode(type)) {
        const values = type.types.flatMap((entry) =>
          ts.isLiteralTypeNode(entry) && ts.isStringLiteral(entry.literal) ? [entry.literal.text] : [],
        );
        if (groups.some((group) => values.filter((value) => group.includes(value)).length >= 2))
          problems.push('Import the module-owned state contract instead of redeclaring a state union.');
      }
      if (
        ts.isPropertySignature(node) &&
        node.name &&
        ['workflow_status', 'paid_recovery_decision'].includes(node.name.getText(source)) &&
        containsBroadString(type)
      )
        problems.push('Use the checkout owner type after parsing; raw storage must be unknown, never string.');
      if (ts.isTypeAliasDeclaration(node) && /PaymentRow$/.test(node.name.text) && type && ts.isTypeLiteralNode(type)) {
        if (
          type.members.some(
            (member) => ts.isPropertySignature(member) && member.name.getText(source) === 'status' && containsBroadString(member.type),
          )
        )
          problems.push('Payment rows must parse unknown storage into the Payments owner contract.');
      }
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === 'createError' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const data = node.arguments[0].properties.find(
        (property) =>
          (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) && property.name.getText(source) === 'data',
      );
      if (
        data &&
        ((ts.isPropertyAssignment(data) && containsPublicCode(data.initializer)) ||
          (ts.isShorthandPropertyAssignment(data) && containsPublicCode(data.name)))
      )
        problems.push('Public checkout error data must use the typed checkoutErrorData producer.');
      const message = node.arguments[0].properties.find(
        (property) => ts.isPropertyAssignment(property) && property.name.getText(source) === 'statusMessage',
      );
      if (
        data &&
        ((ts.isPropertyAssignment(data) && containsPublicCode(data.initializer, new Set(), true)) ||
          (ts.isShorthandPropertyAssignment(data) && containsPublicCode(data.name, new Set(), true))) &&
        message &&
        ts.isPropertyAssignment(message) &&
        (ts.isStringLiteral(message.initializer) || ts.isNoSubstitutionTemplateLiteral(message.initializer))
      )
        problems.push('Static public checkout responses must use the shared checkoutErrorResponse catalog.');
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
};
const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : file.endsWith('.ts') ? [file] : [];
  });

describe('Payment contract ownership regression gate', () => {
  it('rejects an injected duplicate Payment, workflow or recovery definition', () => {
    for (const union of ["'PENDING' | 'PAID' | 'FAILED'", "'payment_pending' | 'finalized'", "'ALLOCATE' | 'BACKORDER' | 'REFUND'"])
      expect(violations('server/application/checkout/duplicate.ts', `type Duplicate = ${union};`)).not.toEqual([]);
    expect(violations('server/application/checkout/duplicate.ts', 'type Claim = { workflow_status: string };')).not.toEqual([]);
    expect(violations('server/application/checkout/duplicate.ts', 'type Claim = { paid_recovery_decision: string | null };')).not.toEqual(
      [],
    );
    expect(violations('server/application/checkout/duplicate.ts', 'type Claim = { workflow_status: string | undefined };')).not.toEqual([]);
    expect(violations('server/domain/payments/duplicate.ts', 'type PaymentRow = { status: string };')).not.toEqual([]);
    expect(violations('server/application/checkout/nested/contracts.ts', "type Duplicate = 'ALLOCATE' | 'REFUND';")).not.toEqual([]);
    expect(violations('server/domain/payments/duplicate.ts', "let status: 'PENDING' | 'PAID';")).not.toEqual([]);
  });
  it('allows SQL/discriminants, owner imports, and provider-owned status', () => {
    expect(
      violations(
        'server/domain/payments/consumer.ts',
        `import type { PaymentStatus } from './contracts'; type PaymentRow = { status: PaymentStatus }; type StripePaymentIntent = { status: string }; const sql = "status IN ('PENDING','PAID')"; type Result = {kind:'prepared'|'existing'};`,
      ),
    ).toEqual([]);
  });
  it('rejects an untyped public error producer', () => {
    expect(violations('server/api/orders/duplicate.ts', "createError({data:{code:'invented_error'}})")).not.toEqual([]);
    expect(violations('server/api/orders/duplicate.ts', "const data={code:'invented_error'}; createError({data});")).not.toEqual([]);
    expect(
      violations('server/api/orders/duplicate.ts', "const details={code:'invented_error'}; createError({data:{...details}});"),
    ).not.toEqual([]);
    expect(violations('server/api/orders/valid.ts', "createError({data:checkoutErrorData('cart_empty')})")).toEqual([]);
  });
  it('rejects inline public response copy while permitting internal diagnostics', () => {
    for (const message of ["'Stripe payments are unavailable.'", '`Stripe payments are unavailable.`'])
      expect(
        violations(
          'server/api/orders/duplicate.ts',
          `createError({statusMessage:${message},data:checkoutErrorData('stripe_payments_disabled')})`,
        ),
      ).not.toEqual([]);
    expect(violations('server/api/orders/valid.ts', "createError(checkoutErrorResponse('stripe_payments_disabled'))")).toEqual([]);
    expect(violations('server/api/orders/valid.ts', "createError({statusMessage:'Unauthorized',statusCode:401})")).toEqual([]);
    expect(
      violations('server/api/orders/valid.ts', 'createError({statusMessage:error.message,data:checkoutErrorData(error.code)})'),
    ).toEqual([]);
  });
  it('production consumers use owner declarations and typed public producers', () => {
    const files = ['server/domain/payments', 'server/application/checkout', 'server/api/orders'].flatMap(sourceFiles);
    expect(files.flatMap((file) => violations(file, readFileSync(file, 'utf8')).map((problem) => `${file}: ${problem}`))).toEqual([]);
  });
  it('typecheck rejects undeclared public codes', () => {
    // @ts-expect-error An undeclared public code must remain a compile-time error.
    checkoutErrorData('invented_error');
    // @ts-expect-error An undeclared response must not bypass the public catalog.
    checkoutErrorResponse('invented_error');
    // @ts-expect-error PlaceOrder must expose only the shared public error contract.
    new PlaceOrderError('invented_error', 409, 'diagnostic');
    expect(checkoutErrorData('cart_empty')).toEqual({ code: 'cart_empty' });
  });
});
