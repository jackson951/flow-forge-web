import { checkSample } from './poll-model';

const sample = JSON.stringify({
  data: { items: [{ id: 'a1', total: 3 }, { id: 2 }, { name: 'no id' }] },
  meta: { next: 'cur-9' },
});

describe('poll sample check (Part 20, FR-20.6)', () => {
  it('finds items, ids and the cursor with the backend rules', () => {
    expect(
      checkSample(sample, { items: 'data.items', identity: 'id', cursor: 'meta.next' }),
    ).toEqual({
      itemCount: 3,
      ids: ['a1', '2'],
      missingIds: 1,
      cursor: 'cur-9',
      itemKeys: ['id', 'total'],
    });
  });

  it('without an items path the whole response is one item; without identity, a content hash', () => {
    expect(checkSample(sample, {})).toMatchObject({ itemCount: 1, ids: ['content hash'] });
  });

  it('a path that is not a list, invalid JSON and bad paths are explained', () => {
    expect(checkSample(sample, { items: 'meta' }).error).toBe(
      '"meta" in the response is not a list',
    );
    expect(checkSample('{oops', {}).error).toBe('The sample is not valid JSON.');
    expect(checkSample(sample, { items: 'data..items' }).error).toMatch(/dot path/);
  });

  it('a missing items path means no items yet (not an error)', () => {
    expect(checkSample(sample, { items: 'data.none' })).toMatchObject({ itemCount: 0 });
  });
});
