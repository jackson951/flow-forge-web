import { isApiError, isRateLimited } from '@/lib/api-client';

export interface ServerErrors<F extends string> {
  /** Messages that belong to a form field (the backend names the property first). */
  fields: Partial<Record<F, string>>;
  /** Anything else, shown above the submit button. */
  form: string | null;
}

/**
 * Splits a backend error into field and form messages. Validation messages from the backend
 * start with the property name ("email must be an email"), so they are matched to fields;
 * rate limits are handled by the countdown, not here.
 */
export function serverErrors<F extends string>(
  error: unknown,
  fields: readonly F[],
): ServerErrors<F> {
  const result: ServerErrors<F> = { fields: {}, form: null };
  if (!error || isRateLimited(error)) return result;
  if (!isApiError(error)) return { ...result, form: 'Something went wrong. Please try again.' };

  const unmatched: string[] = [];
  for (const message of error.messages) {
    const field = fields.find((f) => message.toLowerCase().startsWith(f.toLowerCase()));
    if (field && error.status === 400) result.fields[field] ??= message;
    else unmatched.push(message);
  }
  if (unmatched.length) {
    result.form =
      error.status === 0 || error.status >= 500
        ? `${unmatched.join(' ')}${error.requestId ? ` (request ${error.requestId})` : ''}`
        : unmatched.join(' ');
  }
  return result;
}
