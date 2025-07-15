import { createAdminCommands } from '@/commands';

jest.mock('@/i18n', () => ({
  i18n: {
    getCommandName: (c: string) => c,
    getCommandDescription: jest.fn(),
    getOptionName: jest.fn(),
    getOptionDescription: jest.fn(),
    t: jest.fn()
  }
}));

describe('createAdminCommands', () => {
  test('includes restricted commands', () => {
    const cmds = createAdminCommands();
    expect(cmds.has('register')).toBe(true);
    expect(cmds.has('clear-bunnies')).toBe(true);
    expect(cmds.has('check-config')).toBe(true);
    expect(cmds.has('disable-until')).toBe(true);
  });
});
