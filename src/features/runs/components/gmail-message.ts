export type GmailMessage = Record<string, unknown>;

/** Narrow enough not to replace arbitrary manual-run JSON with the email presentation. */
export function isGmailMessage(value: unknown): value is GmailMessage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const message = value as GmailMessage;
  return (
    typeof message.messageId === 'string' &&
    ['from', 'subject', 'snippet', 'textBody', 'text'].some(
      (field) => typeof message[field] === 'string',
    )
  );
}
