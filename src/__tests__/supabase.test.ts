import { createClient } from '@supabase/supabase-js';
import { database, UserData } from '@/supabase';

describe('Supabase saveUsers', () => {
  const getSkipQuery = (fromMock: jest.Mock) => {
    const skipCallIndexes = fromMock.mock.calls
      .map((call, index) => ({ table: call[0], index }))
      .filter((call) => call.table === 'skips')
      .map((call) => call.index);

    const deleteCallIndex = skipCallIndexes[skipCallIndexes.length - 1];
    return fromMock.mock.results[deleteCallIndex].value;
  };

  const getConfigQueries = (fromMock: jest.Mock) => {
    return fromMock.mock.results
      .map((result, index) => ({ value: result.value, index }))
      .filter((_, index) => fromMock.mock.calls[index][0] === 'config');
  };

  it('removes all skips when no skip entries remain', async () => {
    const mockClient = (createClient as jest.Mock).mock.results[0].value;
    const fromMock = mockClient.from as jest.Mock;
    fromMock.mockClear();

    const data: UserData = {
      all: [{ id: '1', name: 'Alice' }],
      remaining: [{ id: '1', name: 'Alice' }],
      skips: {}
    };

    await database.saveUsers(data);

    const skipQuery = getSkipQuery(fromMock);
    expect(skipQuery.delete).toHaveBeenCalled();
    const deleteResult = skipQuery.delete.mock.results[0].value;
    expect(deleteResult.not).not.toHaveBeenCalled();
  });

  it('retains current skips while deleting stale ones', async () => {
    const mockClient = (createClient as jest.Mock).mock.results[0].value;
    const fromMock = mockClient.from as jest.Mock;
    fromMock.mockClear();

    const data: UserData = {
      all: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ],
      remaining: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' }
      ],
      skips: {
        '1': '2025-01-01',
        '2': '2025-02-01'
      }
    };

    await database.saveUsers(data);

    const skipQuery = getSkipQuery(fromMock);
    const deleteResult = skipQuery.delete.mock.results[0].value;
    expect(deleteResult.not).toHaveBeenCalledWith('user_id', 'in', ['1', '2']);
  });

  it('deletes obsolete config entries when they are not provided', async () => {
    const mockClient = (createClient as jest.Mock).mock.results[0].value;
    const fromMock = mockClient.from as jest.Mock;
    fromMock.mockClear();

    const data: UserData = {
      all: [{ id: '1', name: 'Alice' }],
      remaining: [{ id: '1', name: 'Alice' }],
      lastSelectionDate: '2024-01-01'
    };

    await database.saveUsers(data);

    const configQueries = getConfigQueries(fromMock);
    const [upsertQuery, deleteQuery] = configQueries.map((query) => query.value);

    expect(upsertQuery.upsert).toHaveBeenCalledWith([
      { key: 'lastSelectionDate', value: '2024-01-01' }
    ]);
    expect(deleteQuery.delete).toHaveBeenCalled();
    const deleteResult = deleteQuery.delete.mock.results[0].value;
    expect(deleteResult.in).toHaveBeenCalledWith('key', ['retryUsers', 'lastSelected']);
  });
});
