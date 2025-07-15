import { findUser, UserData } from '@/users';

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
