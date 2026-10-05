import { render, screen } from '@testing-library/react';
import { upcomingFormPart } from '../upcoming-forms';
import { NodeForm } from './node-forms';

const props = {
  config: { connectionId: 'c1', siteId: 's1', projectKeys: ['ENG'] },
  set: vi.fn(),
  setMany: vi.fn(),
  replace: vi.fn(),
  error: () => undefined,
  errors: {},
  touch: vi.fn(),
};

describe('node types whose form comes later (Part 16, FR-16.8)', () => {
  it('an unknown type still says there is no form', () => {
    expect(upcomingFormPart('teams.post')).toBeNull();
    render(<NodeForm type="teams.post" {...props} />);
    expect(screen.getByText(/no settings form for this step type/)).toBeInTheDocument();
  });
});
