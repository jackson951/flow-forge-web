import { compactConfigValue, configDisplayEntries, configHighlights } from './config-display';

describe('workflow configuration display', () => {
  it('flattens every chosen value into readable labels without losing templates', () => {
    expect(
      configDisplayEntries({
        connectionId: 'c1',
        includeSentByMe: false,
        filter: { from: 'customer@example.com', subjectContains: 'Urgent' },
        labels: ['HIGH', 'LOW'],
        text: { ref: 'trigger.textBody' },
      }),
    ).toEqual([
      { path: 'connectionId', label: 'Connection ID', value: 'c1', template: false },
      { path: 'includeSentByMe', label: 'Include sent mail', value: 'No', template: false },
      {
        path: 'filter.from',
        label: 'Filter · From',
        value: 'customer@example.com',
        template: false,
      },
      {
        path: 'filter.subjectContains',
        label: 'Filter · Subject contains',
        value: 'Urgent',
        template: false,
      },
      { path: 'labels', label: 'Labels', value: 'HIGH, LOW', template: false },
      { path: 'text', label: 'Text', value: '{{ trigger.textBody }}', template: true },
    ]);
  });

  it('puts the values that identify a step first on compact canvas cards', () => {
    const highlights = configHighlights('gmail.sendEmail', {
      connectionId: 'connection-id',
      text: 'Body',
      subject: 'Weekly report',
      to: 'ops@example.com',
    });
    expect(highlights.map((item) => item.path)).toEqual(['to', 'subject', 'text']);
  });

  it('shortens long multiline values for the canvas only', () => {
    expect(compactConfigValue('first\nsecond', 20)).toBe('first second');
    expect(compactConfigValue('x'.repeat(60), 12)).toBe('xxxxxxxxxxx…');
  });
});
