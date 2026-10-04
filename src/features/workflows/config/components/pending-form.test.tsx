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
  it.each([
    ['webhook.received', 19],
    ['http.poll', 20],
    ['jira.issue.created', 21],
    ['gmail.sendEmail', 22],
  ])('%s names the part that brings its form (%i)', (type, part) => {
    expect(upcomingFormPart(type)).toBe(part);
    render(<NodeForm type={type} {...props} />);
    expect(screen.getByText(new RegExp(`arrives in frontend Part ${part}`))).toBeInTheDocument();
    expect(screen.getByText(/current settings are kept/)).toBeInTheDocument();
  });

  it('never edits the existing settings', () => {
    render(<NodeForm type="jira.createIssue" {...props} />);
    expect(props.set).not.toHaveBeenCalled();
    expect(props.setMany).not.toHaveBeenCalled();
    expect(props.replace).not.toHaveBeenCalled();
  });

  it('an unknown type still says there is no form', () => {
    expect(upcomingFormPart('teams.post')).toBeNull();
    render(<NodeForm type="teams.post" {...props} />);
    expect(screen.getByText(/no settings form for this step type/)).toBeInTheDocument();
  });
});
