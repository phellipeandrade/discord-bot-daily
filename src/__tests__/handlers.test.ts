import {
  handleRegister,
  handleJoin,
  handleRemove,
  handleList,
  handleSelect,
  handleReset,
  handleReadd
} from '../handlers';
import { saveUsers, selectUser, type UserData } from '../users';
import * as fs from 'fs';

jest.mock('../i18n', () => ({
  i18n: {
    t: jest.fn((key: string) => key),
    getCommandName: jest.fn((c: string) => c),
    getCommandDescription: jest.fn(() => ''),
    getOptionName: jest.fn(() => ''),
    getOptionDescription: jest.fn(() => '')
  }
}));

jest.mock('../users');

jest.mock('fs');

const mockSave = saveUsers as jest.Mock;
const mockSelect = selectUser as jest.Mock;
const mockFs: any = fs;

function createInteraction(options: Record<string, any> = {}) {
  return {
    options: {
      getString: jest.fn().mockImplementation((n: string) => options[n])
    },
    user: { id: '10', username: 'tester' },
    reply: jest.fn()
  } as any;
}

describe('handlers', () => {
  let data: UserData;

  beforeEach(() => {
    jest.clearAllMocks();
    data = { all: [], remaining: [] };
  });

  test('handleRegister adds new user', async () => {
    const interaction = createInteraction({ name: 'Tester' });
    await handleRegister(interaction, data);
    expect(data.all.length).toBe(1);
    expect(mockSave).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('handleJoin self registers', async () => {
    const interaction = createInteraction();
    await handleJoin(interaction, data);
    expect(data.all[0].id).toBe('10');
    expect(mockSave).toHaveBeenCalled();
  });

  test('handleRemove removes user', async () => {
    data.all.push({ name: 'Tester', id: '10' });
    data.remaining.push({ name: 'Tester', id: '10' });
    const interaction = createInteraction({ name: 'Tester' });
    await handleRemove(interaction, data);
    expect(data.all.length).toBe(0);
    expect(mockSave).toHaveBeenCalled();
  });

  test('handleList replies with formatted lists', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction();
    await handleList(interaction, data);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: expect.any(String),
      flags: expect.any(Number)
    });
  });

  test('handleSelect selects user', async () => {
    mockSelect.mockResolvedValue({ name: 'A', id: '1' });
    const interaction = createInteraction();
    await handleSelect(interaction, data);
    expect(mockSelect).toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalled();
  });

  test('handleReset loads original file', async () => {
    mockFs.promises.readFile.mockResolvedValue(JSON.stringify({ all: [] }));
    const interaction = createInteraction();
    await handleReset(interaction, data);
    expect(mockSave).toHaveBeenCalled();
  });

  test('handleReadd restores user', async () => {
    data.all.push({ name: 'A', id: '1' });
    const interaction = createInteraction({ name: 'A' });
    await handleReadd(interaction, data);
    expect(data.remaining.length).toBe(1);
    expect(mockSave).toHaveBeenCalled();
  });
});
