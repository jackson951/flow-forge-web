import { paths, safeNextPath } from './routes';

describe('paths (Part 01, FR-01.7)', () => {
  it('puts every tenant page under /w/:workspaceId', () => {
    expect(paths.workspace('w1')).toBe('/w/w1');
    expect(paths.workflows('w1')).toBe('/w/w1/workflows');
    expect(paths.workflow('w1', 'f1')).toBe('/w/w1/workflows/f1');
    expect(paths.runs('w1')).toBe('/w/w1/runs');
    expect(paths.run('w1', 'r1')).toBe('/w/w1/runs/r1');
    expect(paths.integrations('w1')).toBe('/w/w1/integrations');
    expect(paths.settings('w1')).toBe('/w/w1/settings');
  });
});

describe('safeNextPath', () => {
  it.each([
    ['/w/w1/runs', '/w/w1/runs'],
    ['/w/w1/runs?status=FAILED', '/w/w1/runs?status=FAILED'],
    ['https://evil.example', null],
    ['//evil.example/path', null],
    ['/\\evil.example', null],
    ['javascript:alert(1)', null],
    ['', null],
    [null, null],
  ])('%s → %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
