import { CircleHelp } from 'lucide-react';
import type { TriggerSource } from '@/types/api';
import { providerOfNodeType, TRIGGER_SOURCES, triggerSourceInfo } from './run-helpers';

describe('trigger sources and providers (Part 16, FR-16.2/16.4)', () => {
  it.each<[TriggerSource, string]>([
    ['MANUAL', 'Manual'],
    ['RETRY', 'Retry'],
    ['WEBHOOK', 'Webhook'],
    ['SCHEDULE', 'Schedule'],
    ['POLL', 'Poll'],
  ])('%s has a label and its own icon', (source, label) => {
    const info = triggerSourceInfo(source);
    expect(info.label).toBe(label);
    expect(info.icon).not.toBe(CircleHelp);
  });

  it('every source has a distinct icon', () => {
    const icons = Object.values(TRIGGER_SOURCES).map((s) => s.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('an unknown future source stays visible with its raw value', () => {
    expect(triggerSourceInfo('CALENDAR')).toEqual({ label: 'CALENDAR', icon: CircleHelp });
  });

  it.each([
    ['jira.createIssue', 'JIRA'],
    ['gmail.sendEmail', 'GMAIL'],
    ['http.request', 'HTTP'],
    ['http.poll', 'HTTP'],
    ['slack.sendMessage', 'SLACK'],
    ['util.log', undefined],
  ])('%s belongs to provider %s', (type, provider) => {
    expect(providerOfNodeType(type)).toBe(provider);
  });
});
