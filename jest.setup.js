const path = require('path');
const fs = require('fs');

// Configurar variáveis de ambiente para teste
process.env.USERS_FILE = path.join(__dirname, 'users.test.json');

// Garantir que o arquivo de teste existe
if (!fs.existsSync(process.env.USERS_FILE)) {
  const testData = {
    all: [
      { name: "Phellipe", id: "1" },
      { name: "Serginho", id: "2" },
      { name: "Jane", id: "3" },
      { name: "João", id: "4" },
      { name: "Juliana", id: "5" },
      { name: "Rebecca Messias", id: "6" },
      { name: "Matheus", id: "7" }
    ],
    remaining: [
      { name: "Phellipe", id: "1" },
      { name: "Serginho", id: "2" },
      { name: "Jane", id: "3" },
      { name: "João", id: "4" },
      { name: "Juliana", id: "5" },
      { name: "Rebecca Messias", id: "6" },
      { name: "Matheus", id: "7" }
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
