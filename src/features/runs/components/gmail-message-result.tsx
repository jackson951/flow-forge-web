import { FileText, Mail, Paperclip, UserRound } from 'lucide-react';
import type { GmailMessage } from './gmail-message';

/** Privacy-conscious Gmail result: plain text only, with the body closed initially. */
export function GmailMessageResult({
  value,
  label = 'Email',
}: {
  value: GmailMessage;
  label?: string;
}) {
  const from = stringValue(value.from) || 'Unknown sender';
  const subject = stringValue(value.subject) || '(no subject)';
  const snippet = stringValue(value.snippet);
  const body = stringValue(value.textBody) || stringValue(value.text);
  const attachments = attachmentNames(value.attachmentNames ?? value.attachments);

  return (
    <article aria-label={label} className="border-line bg-surface space-y-3 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <Mail className="text-muted mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{subject}</p>
          <p className="text-muted flex items-center gap-1 text-xs">
            <UserRound className="size-3" aria-hidden />
            <span className="truncate">{from}</span>
          </p>
        </div>
      </div>
      {snippet && <p className="text-muted text-sm">{snippet}</p>}
      {body && (
        <details className="group border-line rounded-md border">
          <summary className="hover:bg-canvas flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium">
            <FileText className="text-muted size-4" aria-hidden />
            Show body
          </summary>
          <pre className="border-line max-h-80 overflow-auto border-t p-3 font-sans text-sm whitespace-pre-wrap">
            {body}
          </pre>
        </details>
      )}
      {attachments.length > 0 && (
        <div className="text-sm">
          <p className="text-muted flex items-center gap-1.5 text-xs font-medium">
            <Paperclip className="size-3.5" aria-hidden />
            Attachment names only
          </p>
          <ul className="mt-1 list-inside list-disc">
            {attachments.map((name, index) => (
              <li key={`${name}-${index}`}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

const stringValue = (value: unknown) => (typeof value === 'string' ? value : '');

function attachmentNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((attachment) => {
    if (typeof attachment === 'string') return attachment;
    if (!attachment || typeof attachment !== 'object') return [];
    const record = attachment as Record<string, unknown>;
    const name = record.name ?? record.filename;
    return typeof name === 'string' ? name : [];
  });
}
