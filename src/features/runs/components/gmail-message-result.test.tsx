import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isGmailMessage } from './gmail-message';
import { GmailMessageResult } from './gmail-message-result';

describe('GmailMessageResult (Part 22)', () => {
  const message = {
    messageId: 'msg-1',
    from: 'sender@example.com',
    subject: 'Hello',
    snippet: 'A short preview',
    textBody: '<img src="https://tracker.invalid/pixel">Plain text only',
    hasAttachments: true,
    attachmentNames: ['invoice.pdf'],
  };

  it('shows the compact envelope and keeps the plain-text body collapsed', async () => {
    const { container } = render(<GmailMessageResult value={message} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('sender@example.com')).toBeInTheDocument();
    expect(screen.getByText('A short preview')).toBeInTheDocument();
    expect(screen.getByText('Attachment names only')).toBeInTheDocument();
    expect(screen.getByText('invoice.pdf')).toBeInTheDocument();
    const details = screen.getByText('Show body').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(container.querySelector('img')).toBeNull();
    await userEvent.click(screen.getByText('Show body'));
    expect(screen.getByText(/tracker\.invalid/)).toBeInTheDocument();
  });

  it('only identifies minimized Gmail-shaped data', () => {
    expect(isGmailMessage(message)).toBe(true);
    expect(isGmailMessage({ messageId: 'manual-only' })).toBe(false);
  });
});
