# Form validation

The application uses Zod 4 with stable vee-validate 4. The upstream
`@vee-validate/zod@4.15.1` adapter requires Zod 3, so it is deliberately removed
rather than installed with an incompatible peer override. vee-validate 5 was
still a beta when this migration was implemented.

`app/utils/zodFormSchema.ts` implements vee-validate's public `TypedSchema`
interface for the existing flat object forms. It preserves typed input/output,
asynchronous validation, field error grouping, root-level prefills and required
field metadata. It is an application-owned bridge, not a general replacement
for the upstream adapter: nested default extraction and nested field metadata
are outside the current consumers' needs.

Use `.prefault(value)` where a schema previously used Zod 3 `.default(value)`.
Zod 4 `.default()` bypasses validation for missing inputs, while `.prefault()`
validates the fallback. The bridge can initialize invalid blank prefills without
allowing those blanks to pass submission. Keep optional account fields without
inner defaults: Zod 4 applies defaults inside `.optional()`, whereas the prior
schemas left missing tax ID, VAT number and IBAN unset.

Required error messages use Zod 4's `error` callback. Union branch issues have
relative paths in Zod 4; the bridge prefixes them before mapping them to form
fields. This preserves errors such as invalid IBAN on the correct field.

`tests/zod-form-schema.spec.ts` checks the bridge contract and
`tests/e2e/zod-validation.spec.ts` checks real forms: enquiry/report invalid and
valid submissions, account prefills, and blank address submission followed by a
successful save. Existing mutation-body and payment-session tests cover server
400 field-error envelopes and conservative browser wire parsing.

The scoped `@vercel/cli-config>zod` override also selects patched Zod 4. Removing
the Zod advisory requires both that override and the direct migration. An audit
may still exit nonzero for unrelated advisories; check the reported advisory IDs
instead of treating a nonzero exit as proof that Zod remains vulnerable.
