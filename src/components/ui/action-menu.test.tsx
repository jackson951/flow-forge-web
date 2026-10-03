import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionMenu } from './action-menu';

describe('ActionMenu', () => {
  it('opens from the keyboard, moves with arrows, skips disabled items and closes on Escape', async () => {
    const selected: string[] = [];
    render(
      <ActionMenu
        label="Actions for X"
        items={[
          { label: 'Open', onSelect: () => selected.push('open') },
          { label: 'Busy', disabled: true, onSelect: () => selected.push('busy') },
          { label: 'Delete', danger: true, onSelect: () => selected.push('delete') },
        ]}
      />,
    );
    const button = screen.getByRole('button', { name: 'Actions for X' });
    button.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Open' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus(); // skips "Busy"
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Open' })).toHaveFocus(); // wraps
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    await userEvent.click(button);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(selected).toEqual(['delete']);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  describe('never clipped by its container (tables with overflow-hidden)', () => {
    const items = ['Open', 'Edit', 'Duplicate', 'Archive', 'Delete'].map((label) => ({
      label,
      onSelect: () => undefined,
    }));

    function renderInClippedTable(buttonRect: Partial<DOMRect>) {
      const view = render(
        <div data-testid="card" style={{ overflow: 'hidden' }}>
          <table>
            <tbody>
              <tr>
                <td>
                  <ActionMenu label="Row actions" items={items} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>,
      );
      const button = screen.getByRole('button', { name: 'Row actions' });
      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: 28,
        height: 28,
        x: 0,
        y: 0,
        toJSON: () => ({}),
        ...buttonRect,
      } as DOMRect);
      return { ...view, button };
    }

    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
      Object.assign(window, { innerHeight: 800, innerWidth: 1200 });
    });
    afterEach(() => vi.restoreAllMocks());

    it('renders in document.body, outside the table, with every item visible', async () => {
      const { button } = renderInClippedTable({ top: 100, bottom: 128, right: 900 });
      await userEvent.click(button);
      const menu = screen.getByRole('menu', { name: 'Row actions' });
      expect(screen.getByTestId('card')).not.toContainElement(menu);
      expect(menu.parentElement).toBe(document.body);
      expect(menu.style.position).toBe('fixed');
      expect(menu).toHaveStyle({ top: '132px', left: '708px', visibility: 'visible' });
      expect(screen.getAllByRole('menuitem')).toHaveLength(5);
    });

    it('opens upward when there is no room below (last rows)', async () => {
      const { button } = renderInClippedTable({ top: 740, bottom: 768, right: 900 });
      await userEvent.click(button);
      // 800 − 768 = 32 px below < 200 px menu → placed above: 740 − 200 − 4.
      expect(screen.getByRole('menu')).toHaveStyle({ top: '536px' });
    });

    it('closes when the page scrolls, instead of drifting away from its row', async () => {
      const { button } = renderInClippedTable({ top: 100, bottom: 128, right: 900 });
      await userEvent.click(button);
      window.dispatchEvent(new Event('scroll'));
      await vi.waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });
  });
});
