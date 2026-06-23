// Read-only / trial-freeze access helper.
//
// Mirrors the backend exactly: when a user's trial expires and they haven't
// subscribed, the backend returns HTTP 402 on paid/write actions and pauses
// their scans. The client uses isReadOnly() to mirror that state in the UI
// (banner + disabled actions) so users hit an upgrade nudge before a 402.
//
// A user is READ-ONLY when:
//   subscription_status !== "active"
//   AND NOT (subscription_status === "trialing" AND trial_ends_at is in the future)
//
// i.e. an active subscriber is never read-only; a trialing user with time left
// is never read-only; everyone else (expired trial, canceled, past_due, null
// trial date, etc.) is read-only.
export function isReadOnly(
  subscriptionStatus?: string | null,
  trialEndsAt?: string | null,
): boolean {
  if (subscriptionStatus === 'active') return false;
  const trialingWithTimeLeft =
    subscriptionStatus === 'trialing' &&
    !!trialEndsAt &&
    new Date(trialEndsAt).getTime() > Date.now();
  return !trialingWithTimeLeft;
}

// Thrown by the API client when the backend returns 402 Payment Required.
// Callers can catch this to show the upgrade prompt instead of a generic error.
export class PaymentRequiredError extends Error {
  readonly status = 402;
  constructor(message = 'Payment required — your trial has ended. Upgrade to resume.') {
    super(message);
    this.name = 'PaymentRequiredError';
  }
}

export function isPaymentRequiredError(e: unknown): e is PaymentRequiredError {
  return (
    e instanceof PaymentRequiredError ||
    (typeof e === 'object' && e !== null && (e as { status?: number }).status === 402)
  );
}
