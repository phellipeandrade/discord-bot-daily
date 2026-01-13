import { findUser, UserData, selectUser, AlreadySelectedTodayError } from '@/users';

// Mock the database
jest.mock('@/supabase', () => ({
  database: {
    saveUsers: jest.fn()
  }
}));

describe('findUser', () => {
  const data: UserData = {
    all: [
      { name: 'Alice', id: '1' },
      { name: 'Bob', id: '2' }
    ],
    remaining: []
  };

  it('finds by user mention', () => {
    expect(findUser(data, '<@1>')?.name).toBe('Alice');
    expect(findUser(data, '<@!2>')?.name).toBe('Bob');
  });

  it('finds by id string', () => {
    expect(findUser(data, '2')).toEqual({ name: 'Bob', id: '2' });
  });

  it('finds by username', () => {
    expect(findUser(data, 'Alice')).toEqual({ name: 'Alice', id: '1' });
  });

  it('returns undefined when not found', () => {
    expect(findUser(data, 'Charlie')).toBeUndefined();
  });
});

describe('selectUser retry functionality', () => {
  const { database } = require('@/supabase');
  
  beforeEach(() => {
    database.saveUsers.mockClear();
  });

  it('prioritizes retry users when selecting', async () => {
    const data: UserData = {
      all: [
        { name: 'Alice', id: '1' },
        { name: 'Bob', id: '2' },
        { name: 'Charlie', id: '3' }
      ],
      remaining: [
        { name: 'Alice', id: '1' },
        { name: 'Bob', id: '2' },
        { name: 'Charlie', id: '3' }
      ],
      retryUsers: ['2'] // Bob should be prioritized
    };

    // Mock Math.random to always select the first eligible user
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0);

    const selected = await selectUser(data);

    // Bob should be selected because he's in retryUsers
    expect(selected.id).toBe('2');
    expect(selected.name).toBe('Bob');

    // Bob should be removed from retryUsers
    expect(data.retryUsers).toBeUndefined();

    // Verify that saveUsers was called
    expect(database.saveUsers).toHaveBeenCalled();

    Math.random = originalRandom;
  });

  it('falls back to normal selection when no retry users are eligible', async () => {
    const data: UserData = {
      all: [
        { name: 'Alice', id: '1' },
        { name: 'Bob', id: '2' }
      ],
      remaining: [
        { name: 'Alice', id: '1' }
      ],
      retryUsers: ['2'] // Bob is in retry but not in remaining
    };

    // Mock Math.random to always select the first eligible user
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0);

    const selected = await selectUser(data);

    // Alice should be selected because Bob is not in remaining
    expect(selected.id).toBe('1');
    expect(selected.name).toBe('Alice');

    // retryUsers should remain unchanged since no retry user was selected
    expect(data.retryUsers).toEqual(['2']);

    Math.random = originalRandom;
  });

  it('clears retryUsers when all retry users are selected', async () => {
    const data: UserData = {
      all: [
        { name: 'Alice', id: '1' },
        { name: 'Bob', id: '2' }
      ],
      remaining: [
        { name: 'Alice', id: '1' }
      ],
      retryUsers: ['1'] // Alice is the only retry user
    };

    // Mock Math.random to always select the first eligible user
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0);

    const selected = await selectUser(data);

    expect(selected.id).toBe('1');
    expect(selected.name).toBe('Alice');

    // retryUsers should be cleared since Alice was selected
    expect(data.retryUsers).toBeUndefined();

    Math.random = originalRandom;
  });

  it('does not immediately reselect the last picked user after a full rotation', async () => {
    const originalRandom = Math.random;
    Math.random = jest.fn(() => 0);

    const data: UserData = {
      all: [
        { name: 'Alice', id: '1' },
        { name: 'Bob', id: '2' }
      ],
      remaining: [
        { name: 'Bob', id: '2' }
      ]
    };

    const selected = await selectUser(data);

    expect(selected.id).toBe('2');
    expect(data.remaining).toEqual([{ name: 'Alice', id: '1' }]);

    Math.random = originalRandom;
  });
});
