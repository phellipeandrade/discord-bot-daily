const path = require('path');
const fs = require('fs');

// Configurar variáveis de ambiente para teste
process.env.USERS_TEST_FILE = path.join(__dirname, 'users.test.json');

// Garantir que o arquivo de teste existe
if (!fs.existsSync(process.env.USERS_TEST_FILE)) {
  const testData = {
    all: [
      { name: "Phellipe", id: "339607705977094144" },
      { name: "Serginho", id: "1071040654857224242" },
      { name: "Jane", id: "874367685201367090" },
      { name: "João", id: "463857217389592577" },
      { name: "Juliana", id: "631214851066429461" },
      { name: "Rebecca Messias", id: "424611539144671234" },
      { name: "Matheus", id: "695007163000815646" }
    ],
    remaining: [
      { name: "Phellipe", id: "339607705977094144" },
      { name: "Serginho", id: "1071040654857224242" },
      { name: "Jane", id: "874367685201367090" },
      { name: "João", id: "463857217389592577" },
      { name: "Juliana", id: "631214851066429461" },
      { name: "Rebecca Messias", id: "424611539144671234" },
      { name: "Matheus", id: "695007163000815646" }
    ],
    lastSelected: null
  };
  fs.writeFileSync(process.env.USERS_TEST_FILE, JSON.stringify(testData, null, 2));
}

// Mock das funções do fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
})); 