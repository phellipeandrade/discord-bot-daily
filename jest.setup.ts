import path from 'path';
import fs from 'fs';

// Configurar variáveis de ambiente para teste
process.env.USERS_FILE = path.join(__dirname, 'users.test.json');
process.env.DATE_FORMAT = 'YYYY-MM-DD';

// Garantir que o arquivo de teste existe
if (!fs.existsSync(process.env.USERS_FILE)) {
  const testData = {
    all: [
      { name: 'User1', id: '1' },
      { name: 'User2', id: '2' },
      { name: 'User3', id: '3' },
      { name: 'User4', id: '4' },
      { name: 'User5', id: '5' },
      { name: 'User6', id: '6' },
      { name: 'User7', id: '7' }
    ],
    remaining: [
      { name: 'User1', id: '1' },
      { name: 'User2', id: '2' },
      { name: 'User3', id: '3' },
      { name: 'User4', id: '4' },
      { name: 'User5', id: '5' },
      { name: 'User6', id: '6' },
      { name: 'User7', id: '7' }
    ],
    lastSelected: null
  };
  fs.writeFileSync(process.env.USERS_FILE, JSON.stringify(testData, null, 2));
}

// Mock das funções do fs
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
