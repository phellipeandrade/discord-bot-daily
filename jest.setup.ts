import path from 'path';

// Configurar variáveis de ambiente para teste
// Users are now stored in SQLite database, no JSON file needed

// Mock das funções do fs para outros arquivos que ainda usam
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));
