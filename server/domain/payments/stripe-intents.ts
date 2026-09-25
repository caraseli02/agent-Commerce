import {
  assertOutsideCheckoutTransaction,
  getCheckoutDatabase,
  withCheckoutTransaction,
  type CheckoutDatabase,
} from '~/server/infrastructure/checkout-database';

export type StripePaymentIntent = Readonly<{
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  clientSecret: string | null;
  metadata: Readonly<{ paymentId?: string; orderId?: string }>;
}>;

export type StripeIntentProvider = Readonly<{
  create(
    input: { paymentId: string; orderId: string; amountMinor: number; currency: 'RON' },
    idempotencyKey: string,
  ): Promise<StripePaymentIntent>;
  retrieve(intentId: string): Promise<StripePaymentIntent>;
  cancel(intentId: string, reason: 'abandoned' | 'requested_by_customer'): Promise<StripePaymentIntent>;
}>;

type PaymentRow = {
  id: string;
  order_id: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELED' | 'FAILED';
  amount_minor: number;
  currency: 'RON';
  stripe_payment_intent_id: string | null;
  stripe_payment_intent_create_started_at: Date | null;
  cancellation_requested_at: Date | null;
  row_version: string;
};

export type InitiatePaymentResult =
  | Readonly<{ kind: 'requires-action'; nextAction: Readonly<{ type: 'client-secret'; clientSecret: string }> }>
  | Readonly<{ kind: 'processing' | 'succeeded' | 'terminal-failure' | 'recovery-required' }>;

export type CancelPaymentResult = Readonly<{ kind: 'canceled' | 'paid' | 'recovery-required' }>;
export type ReconcilePaymentResult = Readonly<{
  kind: 'paid' | 'canceled' | 'pending' | 'processing' | 'terminal-failure' | 'recovery-required';
}>;
export type VerifiedIntentEventResult =
  | Readonly<{
      kind: 'paid' | 'canceled' | 'pending' | 'processing' | 'terminal-failure';
      paymentId: string;
      orderId: string;
      duplicate: boolean;
    }>
  | Readonly<{ kind: 'recovery-required' }>;

type ReconciledStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELED';

const replayWindowMs = 24 * 60 * 60 * 1000;
const recoveryRequired = { kind: 'recovery-required' } as const;

const readPayment = async (paymentId: string): Promise<PaymentRow | null> => {
  const database = await getCheckoutDatabase();
  const [payment] = await database.query<PaymentRow>('SELECT *, xmin::text AS row_version FROM checkout_payments WHERE id=$1', [paymentId]);
  return payment ?? null;
};

const isMatchingIntent = (intent: StripePaymentIntent, payment: PaymentRow) =>
  intent.id.startsWith('pi_') &&
  intent.amountMinor === Number(payment.amount_minor) &&
  intent.currency.toUpperCase() === payment.currency &&
  intent.metadata.paymentId === payment.id &&
  intent.metadata.orderId === payment.order_id;

const localStatusFromIntent = (status: string): ReconciledStatus | null => {
  switch (status) {
    case 'succeeded':
      return 'PAID';
    case 'canceled':
      return 'CANCELED';
    case 'processing':
      return 'PROCESSING';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'PENDING';
    default:
      return null;
  }
};

const reconciliationResultForStatus = (status: PaymentRow['status'] | null): ReconcilePaymentResult => {
  switch (status) {
    case 'PAID':
      return { kind: 'paid' };
    case 'CANCELED':
      return { kind: 'canceled' };
    case 'PROCESSING':
      return { kind: 'processing' };
    case 'PENDING':
      return { kind: 'pending' };
    case 'FAILED':
      return { kind: 'terminal-failure' };
    default:
      return recoveryRequired;
  }
};

const verifiedEventResult = (payment: PaymentRow, duplicate: boolean): VerifiedIntentEventResult =>
  ({
    ...reconciliationResultForStatus(payment.status),
    paymentId: payment.id,
    orderId: payment.order_id,
    duplicate,
  }) as VerifiedIntentEventResult;

const staleEventObservation = Symbol('stale Stripe event observation');
const supportedIntentEvents = new Set([
  'payment_intent.succeeded',
  'payment_intent.processing',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
]);
type EventRow = { event_id: string; event_type: string; stripe_payment_intent_id: string; payment_id: string };

const readEvent = async (eventId: string): Promise<EventRow | null> => {
  const database = await getCheckoutDatabase();
  const [event] = await database.query<EventRow>('SELECT * FROM checkout_stripe_webhook_events WHERE event_id=$1', [eventId]);
  return event ?? null;
};

const readPaymentByIntent = async (intentId: string): Promise<PaymentRow | null> => {
  const database = await getCheckoutDatabase();
  const [payment] = await database.query<PaymentRow>(
    'SELECT *, xmin::text AS row_version FROM checkout_payments WHERE stripe_payment_intent_id=$1',
    [intentId],
  );
  return payment ?? null;
};

// The webhook can call this database-only operation in its event-ID transaction.
export const applyReconciledPaymentTransition = async (
  database: CheckoutDatabase,
  input: {
    paymentId: string;
    intentId: string;
    expectedRowVersion: string;
    status: ReconciledStatus;
    updatedAt: string;
  },
): Promise<Readonly<{ applied: boolean; status: PaymentRow['status'] | null }>> => {
  const applied = await database.execute(
    `UPDATE checkout_payments SET status=$1, updated_at=$2
      WHERE id=$3 AND stripe_payment_intent_id=$4 AND status IN ('PENDING','PROCESSING')
        AND xmin::text=$5`,
    [input.status, input.updatedAt, input.paymentId, input.intentId, input.expectedRowVersion],
  );
  const [current] = await database.query<{ status: PaymentRow['status'] }>('SELECT status FROM checkout_payments WHERE id=$1', [
    input.paymentId,
  ]);
  return { applied: applied === 1, status: current?.status ?? null };
};

const persistIntentId = async (payment: PaymentRow, intent: StripePaymentIntent) => {
  if (!isMatchingIntent(intent, payment)) return false;
  const database = await getCheckoutDatabase();
  const rows = await database.query<{ id: string }>(
    `UPDATE checkout_payments SET stripe_payment_intent_id=$1, updated_at=$2
      WHERE id=$3 AND stripe_payment_intent_create_started_at IS NOT NULL
        AND (stripe_payment_intent_id IS NULL OR stripe_payment_intent_id=$1)
      RETURNING id`,
    [intent.id, new Date().toISOString(), payment.id],
  );
  return rows.length === 1;
};

export const createStripeIntentAdapter = (options: {
  provider: StripeIntentProvider;
  enabled?: () => boolean;
  now?: () => Date;
  onRecoveryRequired?: (paymentId: string) => Promise<void>;
}) => {
  const isEnabled = options.enabled ?? (() => false);
  const now = options.now ?? (() => new Date());

  // The caller must verify the Stripe signature before entering this internal operation.
  const applyVerifiedIntentEvent = async (input: {
    eventId: string;
    eventType: string;
    intentId: string;
  }): Promise<VerifiedIntentEventResult> => {
    assertOutsideCheckoutTransaction('Stripe verified event application');
    if (!isEnabled() || !input.eventId || !input.intentId || !supportedIntentEvents.has(input.eventType)) return recoveryRequired;

    const duplicate = await readEvent(input.eventId);
    if (duplicate) {
      if (duplicate.event_type !== input.eventType || duplicate.stripe_payment_intent_id !== input.intentId) return recoveryRequired;
      const current = await readPayment(duplicate.payment_id);
      return current?.stripe_payment_intent_id === input.intentId ? verifiedEventResult(current, true) : recoveryRequired;
    }

    const payment = await readPaymentByIntent(input.intentId);
    if (!payment) return recoveryRequired;
    let intent: StripePaymentIntent;
    try {
      intent = await options.provider.retrieve(input.intentId);
    } catch {
      return recoveryRequired;
    }
    if (intent.id !== input.intentId || !isMatchingIntent(intent, payment)) return recoveryRequired;
    const nextStatus = localStatusFromIntent(intent.status);
    if (!nextStatus) return recoveryRequired;

    try {
      return await withCheckoutTransaction(async () => {
        const database = await getCheckoutDatabase();
        const [inserted] = await database.query<{ event_id: string }>(
          `INSERT INTO checkout_stripe_webhook_events
             (event_id, event_type, stripe_payment_intent_id, payment_id, observed_at)
           VALUES ($1,$2,$3,$4,$5::timestamptz)
           ON CONFLICT (event_id) DO NOTHING RETURNING event_id`,
          [input.eventId, input.eventType, input.intentId, payment.id, now().toISOString()],
        );
        if (!inserted) {
          const existing = await readEvent(input.eventId);
          const current = await readPayment(payment.id);
          if (
            !existing ||
            existing.event_type !== input.eventType ||
            existing.stripe_payment_intent_id !== input.intentId ||
            existing.payment_id !== payment.id ||
            current?.stripe_payment_intent_id !== input.intentId
          )
            throw staleEventObservation;
          return verifiedEventResult(current, true);
        }

        if (payment.status === 'PAID' || payment.status === 'CANCELED') {
          const current = await readPayment(payment.id);
          if (
            !current ||
            current.row_version !== payment.row_version ||
            current.stripe_payment_intent_id !== input.intentId ||
            (current.status === 'CANCELED' && nextStatus !== 'CANCELED')
          )
            throw staleEventObservation;
          return verifiedEventResult(current, false);
        }
        if (payment.status === 'FAILED') throw staleEventObservation;
        const transition = await applyReconciledPaymentTransition(database, {
          paymentId: payment.id,
          intentId: input.intentId,
          expectedRowVersion: payment.row_version,
          status: nextStatus,
          updatedAt: now().toISOString(),
        });
        if (!transition.applied) throw staleEventObservation;
        return {
          ...reconciliationResultForStatus(transition.status),
          paymentId: payment.id,
          orderId: payment.order_id,
          duplicate: false,
        } as VerifiedIntentEventResult;
      });
    } catch (error) {
      if (
        error === staleEventObservation ||
        (error as { code?: string })?.code === '40001' ||
        (error as { code?: string })?.code === '40P01'
      )
        return recoveryRequired;
      throw error;
    }
  };

  const reconcilePayment = async (input: { paymentId: string }): Promise<ReconcilePaymentResult> => {
    assertOutsideCheckoutTransaction('Stripe PaymentIntent reconciliation');
    const payment = await readPayment(input.paymentId);
    if (!payment) return recoveryRequired;
    if (payment.status === 'PAID' || payment.status === 'CANCELED' || payment.status === 'FAILED')
      return reconciliationResultForStatus(payment.status);
    if (!isEnabled() || !payment.stripe_payment_intent_id) return recoveryRequired;
    let intent: StripePaymentIntent;
    try {
      intent = await options.provider.retrieve(payment.stripe_payment_intent_id);
    } catch {
      return recoveryRequired;
    }
    if (intent.id !== payment.stripe_payment_intent_id || !isMatchingIntent(intent, payment)) return recoveryRequired;
    const nextStatus = localStatusFromIntent(intent.status);
    if (!nextStatus) return recoveryRequired;
    const transition = await withCheckoutTransaction(async () =>
      applyReconciledPaymentTransition(await getCheckoutDatabase(), {
        paymentId: payment.id,
        intentId: intent.id,
        expectedRowVersion: payment.row_version,
        status: nextStatus,
        updatedAt: now().toISOString(),
      }),
    );
    return reconciliationResultForStatus(transition.status);
  };

  const recoverIntent = async (payment: PaymentRow): Promise<StripePaymentIntent | null> => {
    if (payment.stripe_payment_intent_id) {
      try {
        const intent = await options.provider.retrieve(payment.stripe_payment_intent_id);
        if (isMatchingIntent(intent, payment)) return intent;
        await options.onRecoveryRequired?.(payment.id);
        return null;
      } catch {
        return null;
      }
    }
    const startedAt = payment.stripe_payment_intent_create_started_at;
    if (!startedAt || now().getTime() - new Date(startedAt).getTime() >= replayWindowMs) {
      if (startedAt) await options.onRecoveryRequired?.(payment.id);
      return null;
    }
    let intent: StripePaymentIntent;
    try {
      intent = await options.provider.create(
        { paymentId: payment.id, orderId: payment.order_id, amountMinor: Number(payment.amount_minor), currency: payment.currency },
        `payment:${payment.id}:intent`,
      );
    } catch {
      return null;
    }
    if (await persistIntentId(payment, intent)) return intent;
    await options.onRecoveryRequired?.(payment.id);
    return null;
  };

  const initiatePayment = async (input: { paymentId: string }): Promise<InitiatePaymentResult> => {
    assertOutsideCheckoutTransaction('Stripe PaymentIntent initiation');
    if (!isEnabled()) return recoveryRequired;
    let payment = await readPayment(input.paymentId);
    if (!payment || payment.status === 'FAILED' || payment.status === 'CANCELED') return { kind: 'terminal-failure' };
    if (payment.status === 'PAID') return { kind: 'succeeded' };
    if (payment.cancellation_requested_at) return recoveryRequired;
    if (!payment.stripe_payment_intent_id && !payment.stripe_payment_intent_create_started_at) {
      const database = await getCheckoutDatabase();
      const [started] = await database.query<PaymentRow>(
        `UPDATE checkout_payments SET stripe_payment_intent_create_started_at=$1::timestamptz, updated_at=$1::text
          WHERE id=$2 AND status='PENDING' AND stripe_payment_intent_id IS NULL
            AND stripe_payment_intent_create_started_at IS NULL AND cancellation_requested_at IS NULL
          RETURNING *`,
        [now().toISOString(), payment.id],
      );
      payment = started ?? (await readPayment(payment.id));
      if (!payment || payment.cancellation_requested_at || payment.status !== 'PENDING') return recoveryRequired;
    }
    const intent = await recoverIntent(payment);
    if (!intent) return recoveryRequired;
    if (intent.status === 'processing') return { kind: 'processing' };
    if (intent.status === 'succeeded') {
      await options.onRecoveryRequired?.(payment.id);
      return recoveryRequired;
    }
    if (intent.status === 'canceled') return { kind: 'terminal-failure' };
    if (!['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(intent.status) || !intent.clientSecret)
      return recoveryRequired;

    // This conditional write is the linearization point for returning a client secret.
    const database = await getCheckoutDatabase();
    const [allowed] = await database.query<{ id: string }>(
      `UPDATE checkout_payments SET updated_at=$1
        WHERE id=$2 AND stripe_payment_intent_id=$3 AND status='PENDING'
          AND cancellation_requested_at IS NULL
        RETURNING id`,
      [now().toISOString(), payment.id, intent.id],
    );
    return allowed
      ? { kind: 'requires-action', nextAction: { type: 'client-secret', clientSecret: intent.clientSecret } }
      : recoveryRequired;
  };

  const cancelPayment = async (input: {
    paymentId: string;
    reason: 'abandoned' | 'requested_by_customer';
  }): Promise<CancelPaymentResult> => {
    assertOutsideCheckoutTransaction('Stripe PaymentIntent cancellation');
    if (!isEnabled()) return recoveryRequired;
    let payment = await readPayment(input.paymentId);
    if (!payment) return recoveryRequired;
    if (payment.status === 'PAID') {
      await options.onRecoveryRequired?.(payment.id);
      return { kind: 'paid' };
    }
    if (payment.status === 'CANCELED') return { kind: 'canceled' };
    if (payment.status === 'FAILED') return recoveryRequired;

    const database = await getCheckoutDatabase();
    const [localCancellation] = await database.query<{ id: string }>(
      `UPDATE checkout_payments SET status='CANCELED', cancellation_requested_at=COALESCE(cancellation_requested_at,$1::timestamptz), updated_at=$1::text
        WHERE id=$2 AND status='PENDING' AND stripe_payment_intent_id IS NULL
          AND stripe_payment_intent_create_started_at IS NULL
        RETURNING id`,
      [now().toISOString(), payment.id],
    );
    if (localCancellation) return { kind: 'canceled' };

    await database.execute(
      `UPDATE checkout_payments SET cancellation_requested_at=COALESCE(cancellation_requested_at,$1::timestamptz), updated_at=$1::text
        WHERE id=$2 AND status IN ('PENDING','PROCESSING')`,
      [now().toISOString(), payment.id],
    );
    payment = await readPayment(payment.id);
    if (!payment) return recoveryRequired;
    if (payment.status === 'PAID') {
      await options.onRecoveryRequired?.(payment.id);
      return { kind: 'paid' };
    }
    if (payment.status === 'CANCELED') return { kind: 'canceled' };
    const intent = await recoverIntent(payment);
    if (!intent) return recoveryRequired;

    let outcome = intent;
    if (intent.status !== 'canceled' && intent.status !== 'succeeded') {
      try {
        outcome = await options.provider.cancel(intent.id, input.reason);
      } catch {
        try {
          outcome = await options.provider.retrieve(intent.id);
        } catch {
          return recoveryRequired;
        }
      }
    }
    if (!isMatchingIntent(outcome, payment)) return recoveryRequired;
    if (outcome.status === 'succeeded') {
      await database.execute(
        `UPDATE checkout_payments SET status='PAID', updated_at=$1
          WHERE id=$2 AND stripe_payment_intent_id=$3 AND status IN ('PENDING','PROCESSING')`,
        [now().toISOString(), payment.id, intent.id],
      );
      await options.onRecoveryRequired?.(payment.id);
    } else if (outcome.status === 'canceled') {
      await database.execute(
        `UPDATE checkout_payments SET status='CANCELED', updated_at=$1
          WHERE id=$2 AND stripe_payment_intent_id=$3 AND status IN ('PENDING','PROCESSING')`,
        [now().toISOString(), payment.id, intent.id],
      );
    }
    const current = await readPayment(payment.id);
    if (current?.status === 'PAID') return { kind: 'paid' };
    if (current?.status === 'CANCELED') return { kind: 'canceled' };
    return recoveryRequired;
  };

  return { initiatePayment, cancelPayment, reconcilePayment, applyVerifiedIntentEvent };
};
