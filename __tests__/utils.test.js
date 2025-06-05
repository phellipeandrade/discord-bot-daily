const fs = require('fs');
const path = require('path');

// Mock das funções do fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock do arquivo de usuários
const MOCK_USERS_FILE = path.join(__dirname, '..', 'src', 'users.json');

// Importando as funções que queremos testar
const {
  carregarUsuarios,
  salvarUsuarios,
  escolherUsuario
} = require('../src/index.ts');

describe('Funções Utilitárias', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste
    jest.clearAllMocks();
  });

  describe('carregarUsuarios', () => {
    it('deve criar arquivo se não existir', () => {
      fs.existsSync.mockImplementation(() => false);
      fs.writeFileSync.mockImplementation(() => {});
      
      carregarUsuarios();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        MOCK_USERS_FILE,
        JSON.stringify({ all: [], remaining: [] }, null, 2)
      );
    });

    it('deve carregar corretamente o arquivo de usuários', () => {
      const mockData = {
        all: [{ name: 'user1', id: '123' }, { name: 'user2', id: '456' }],
        remaining: [{ name: 'user1', id: '123' }],
        lastSelected: { name: 'user2', id: '456' }
      };

      fs.existsSync.mockImplementation(() => true);
      fs.readFileSync.mockImplementation(() => JSON.stringify(mockData));

      const result = carregarUsuarios();

      expect(result).toEqual(mockData);
      expect(fs.readFileSync).toHaveBeenCalledWith(MOCK_USERS_FILE, 'utf-8');
    });

    it('deve retornar dados vazios se o arquivo estiver corrompido', () => {
      fs.existsSync.mockImplementation(() => true);
      fs.readFileSync.mockImplementation(() => 'invalid json');

      const result = carregarUsuarios();

      expect(result).toEqual({ all: [], remaining: [] });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        MOCK_USERS_FILE,
        JSON.stringify({ all: [], remaining: [] }, null, 2)
      );
    });
  });

  describe('salvarUsuarios', () => {
    it('deve salvar corretamente os dados dos usuários', () => {
      const mockData = {
        all: [{ name: 'user1', id: '123' }, { name: 'user2', id: '456' }],
        remaining: [{ name: 'user1', id: '123' }],
        lastSelected: { name: 'user2', id: '456' }
      };

      fs.writeFileSync.mockImplementation(() => {});

      salvarUsuarios(mockData);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        MOCK_USERS_FILE,
        JSON.stringify(mockData, null, 2),
        'utf-8'
      );
    });

    it('deve manter a estrutura correta dos dados', () => {
      const mockData = {
        all: [{ name: 'user1', id: '123' }, { name: 'user2', id: '456' }],
        remaining: [{ name: 'user1', id: '123' }],
        lastSelected: { name: 'user2', id: '456' }
      };

      let savedData;
      fs.writeFileSync.mockImplementation((file, data) => {
        savedData = JSON.parse(data);
      });

      salvarUsuarios(mockData);

      expect(savedData).toHaveProperty('all');
      expect(savedData).toHaveProperty('remaining');
      expect(savedData).toHaveProperty('lastSelected');
      expect(Array.isArray(savedData.all)).toBe(true);
      expect(Array.isArray(savedData.remaining)).toBe(true);
      expect(savedData.all[0]).toHaveProperty('name');
      expect(savedData.all[0]).toHaveProperty('id');
    });
  });

  describe('escolherUsuario', () => {
    it('deve escolher um usuário da lista remaining', () => {
      const mockData = {
        all: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' },
          { name: 'user3', id: '789' }
        ],
        remaining: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' }
        ],
        lastSelected: { name: 'user3', id: '789' }
      };

      const result = escolherUsuario(mockData);

      expect(mockData.remaining).toHaveLength(1);
      expect(mockData.all.some(u => u.id === result.id)).toBe(true);
      expect(mockData.lastSelected).toEqual(result);
    });

    it('deve recarregar a lista remaining quando estiver vazia', () => {
      const mockData = {
        all: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' }
        ],
        remaining: [],
        lastSelected: { name: 'user2', id: '456' }
      };

      const result = escolherUsuario(mockData);

      expect(mockData.remaining).toHaveLength(1);
      expect(mockData.all.some(u => u.id === result.id)).toBe(true);
      expect(mockData.lastSelected).toEqual(result);
      expect(mockData.all).toEqual(expect.arrayContaining(mockData.remaining));
    });

    it('deve manter a lista all inalterada após seleção', () => {
      const mockData = {
        all: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' },
          { name: 'user3', id: '789' }
        ],
        remaining: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' }
        ],
        lastSelected: { name: 'user3', id: '789' }
      };

      const originalAll = [...mockData.all];
      escolherUsuario(mockData);

      expect(mockData.all).toEqual(originalAll);
    });
  });
}); 