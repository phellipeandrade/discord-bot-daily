const fs = require('fs');
const path = require('path');

// Mock das funções do fs
jest.mock('fs');

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
      fs.existsSync.mockReturnValue(false);
      
      carregarUsuarios();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        MOCK_USERS_FILE,
        JSON.stringify({ all: [], remaining: [] }, null, 2)
      );
    });

    it('deve carregar corretamente o arquivo de usuários', () => {
      const mockData = {
        all: ['user1', 'user2'],
        remaining: ['user1'],
        lastSelected: 'user2'
      };

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const result = carregarUsuarios();

      expect(result).toEqual(mockData);
      expect(fs.readFileSync).toHaveBeenCalledWith(MOCK_USERS_FILE, 'utf-8');
    });

    it('deve lançar erro se o arquivo estiver corrompido', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');

      expect(() => carregarUsuarios()).toThrow();
    });
  });

  describe('salvarUsuarios', () => {
    it('deve salvar corretamente os dados dos usuários', () => {
      const mockData = {
        all: ['user1', 'user2'],
        remaining: ['user1'],
        lastSelected: 'user2'
      };

      salvarUsuarios(mockData);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        MOCK_USERS_FILE,
        JSON.stringify(mockData, null, 2),
        'utf-8'
      );
    });

    it('deve manter a estrutura correta dos dados', () => {
      const mockData = {
        all: ['user1', 'user2'],
        remaining: ['user1'],
        lastSelected: 'user2'
      };

      salvarUsuarios(mockData);

      const savedData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(savedData).toHaveProperty('all');
      expect(savedData).toHaveProperty('remaining');
      expect(savedData).toHaveProperty('lastSelected');
      expect(Array.isArray(savedData.all)).toBe(true);
      expect(Array.isArray(savedData.remaining)).toBe(true);
    });
  });

  describe('escolherUsuario', () => {
    it('deve escolher um usuário da lista remaining', () => {
      const mockData = {
        all: ['user1', 'user2', 'user3'],
        remaining: ['user1', 'user2'],
        lastSelected: 'user3'
      };

      const result = escolherUsuario(mockData);

      expect(mockData.remaining).toHaveLength(1);
      expect(mockData.all).toContain(result);
      expect(mockData.lastSelected).toBe(result);
    });

    it('deve recarregar a lista remaining quando estiver vazia', () => {
      const mockData = {
        all: ['user1', 'user2'],
        remaining: [],
        lastSelected: 'user2'
      };

      const result = escolherUsuario(mockData);

      expect(mockData.remaining).toHaveLength(1);
      expect(mockData.all).toContain(result);
      expect(mockData.lastSelected).toBe(result);
      expect(mockData.all).toEqual(expect.arrayContaining(mockData.remaining));
    });

    it('deve manter a lista all inalterada após seleção', () => {
      const mockData = {
        all: ['user1', 'user2', 'user3'],
        remaining: ['user1', 'user2'],
        lastSelected: 'user3'
      };

      const originalAll = [...mockData.all];
      escolherUsuario(mockData);

      expect(mockData.all).toEqual(originalAll);
    });
  });
}); 