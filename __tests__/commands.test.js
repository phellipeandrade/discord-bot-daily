// Mock das funções utilitárias
jest.mock('../src/index.ts', () => {
  const originalModule = jest.requireActual('../src/index.ts');
  return {
    ...originalModule,
    carregarUsuarios: jest.fn(),
    salvarUsuarios: jest.fn(),
    escolherUsuario: jest.fn()
  };
});

const {
  handleCadastrar,
  handleEntrar,
  handleRemover,
  handleListar,
  handleSelecionar,
  escolherUsuario
} = require('../src/index.ts');

describe('Comandos do Bot', () => {
  let mockInteraction;

  beforeEach(() => {
    // Reset todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Mock básico da interaction
    mockInteraction = {
      reply: jest.fn(),
      options: {
        getString: jest.fn()
      },
      member: {
        user: {
          username: 'testUser',
          id: '123456'
        }
      },
      user: {
        username: 'testUser',
        id: '123456'
      }
    };
  });

  describe('handleCadastrar', () => {
    it('deve cadastrar um novo usuário com sucesso', async () => {
      const mockData = {
        all: [{ name: 'existingUser', id: '789' }],
        remaining: [{ name: 'existingUser', id: '789' }]
      };

      mockInteraction.options.getString.mockReturnValue('newUser');

      await handleCadastrar(mockInteraction, mockData);

      expect(mockData.all.some(u => u.name === 'newUser' && u.id === '123456')).toBe(true);
      expect(mockData.remaining.some(u => u.name === 'newUser' && u.id === '123456')).toBe(true);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('cadastrado com sucesso')
      );
    });

    it('não deve cadastrar um usuário que já existe', async () => {
      const mockData = {
        all: [{ name: 'existingUser', id: '123456' }],
        remaining: [{ name: 'existingUser', id: '123456' }]
      };

      mockInteraction.options.getString.mockReturnValue('newUser');

      await handleCadastrar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('já está cadastrado')
      );
    });
  });

  describe('handleEntrar', () => {
    it('deve cadastrar o usuário atual com sucesso', async () => {
      const mockData = {
        all: [{ name: 'existingUser', id: '789' }],
        remaining: [{ name: 'existingUser', id: '789' }]
      };

      await handleEntrar(mockInteraction, mockData);

      expect(mockData.all.some(u => u.name === 'testUser' && u.id === '123456')).toBe(true);
      expect(mockData.remaining.some(u => u.name === 'testUser' && u.id === '123456')).toBe(true);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('cadastrado com sucesso')
      );
    });

    it('não deve cadastrar o usuário atual se já existir', async () => {
      const mockData = {
        all: [{ name: 'testUser', id: '123456' }],
        remaining: [{ name: 'testUser', id: '123456' }]
      };

      await handleEntrar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('já está cadastrado')
      );
    });
  });

  describe('handleRemover', () => {
    it('deve remover um usuário com sucesso', async () => {
      const mockData = {
        all: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' }
        ],
        remaining: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' }
        ]
      };

      mockInteraction.options.getString.mockReturnValue('user1');

      await handleRemover(mockInteraction, mockData);

      expect(mockData.all.some(u => u.name === 'user1')).toBe(false);
      expect(mockData.remaining.some(u => u.name === 'user1')).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('removido com sucesso')
      );
    });

    it('deve informar quando tentar remover um usuário que não existe', async () => {
      const mockData = {
        all: ['user1'],
        remaining: ['user1']
      };

      mockInteraction.options.getString.mockReturnValue('nonexistentUser');

      await handleRemover(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('não está na lista')
      );
    });
  });

  describe('handleListar', () => {
    it('deve listar usuários corretamente', async () => {
      const mockData = {
        all: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' }
        ],
        remaining: [{ name: 'user2', id: '456' }]
      };

      await handleListar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringMatching(/user1.*user2/s),
        ephemeral: true
      });
    });

    it('deve mostrar mensagem apropriada quando não há usuários', async () => {
      const mockData = {
        all: [],
        remaining: []
      };

      await handleListar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('(nenhum)'),
        ephemeral: true
      });
    });

    it('deve mostrar corretamente usuários pendentes e já sorteados', async () => {
      const mockData = {
        all: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' },
          { name: 'user3', id: '789' }
        ],
        remaining: [
          { name: 'user2', id: '456' },
          { name: 'user3', id: '789' }
        ]
      };

      await handleListar(mockInteraction, mockData);

      const reply = mockInteraction.reply.mock.calls[0][0];
      expect(reply.content).toMatch(/Cadastrados:.*user1.*user2.*user3/s);
      expect(reply.content).toMatch(/Ainda não sorteados:.*user2.*user3/s);
      expect(reply.content).toMatch(/Já sorteados:.*user1/s);
    });
  });

  describe('handleSelecionar', () => {
    it('deve selecionar um usuário corretamente', async () => {
      const mockData = {
        all: [
          { name: 'user1', id: '123' },
          { name: 'user2', id: '456' }
        ],
        remaining: [{ name: 'user2', id: '456' }]
      };

      const selectedUser = { name: 'user2', id: '456' };
      escolherUsuario.mockReturnValue(selectedUser);

      await handleSelecionar(mockInteraction, mockData);

      expect(escolherUsuario).toHaveBeenCalledWith(mockData);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining(`<@${selectedUser.id}>`)
      );
    });

    it('deve recarregar a lista quando não houver mais usuários disponíveis', async () => {
      const mockData = {
        all: ['user1', 'user2'],
        remaining: []
      };

      escolherUsuario.mockImplementation((data) => {
        data.remaining = [...data.all];
        return data.remaining[0];
      });

      await handleSelecionar(mockInteraction, mockData);

      expect(mockData.remaining).toEqual(mockData.all);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('user1')
      );
    });
  });
}); 