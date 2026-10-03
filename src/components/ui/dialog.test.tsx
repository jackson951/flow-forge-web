import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from './button';
import { Dialog } from './dialog';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm"
        description="Are you sure?"
      >
        <Button>First</Button>
        <Button>Last</Button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('is labelled, takes focus, traps Tab, closes on Escape and returns focus', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Confirm' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Are you sure?');
    // First focusable element is the close button.
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await userEvent.tab(); // wraps
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab({ shift: true }); // wraps backwards
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
