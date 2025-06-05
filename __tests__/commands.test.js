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
          username: 'testUser'
        }
      },
      user: {
        username: 'testUser'
      }
    };
  });

  describe('handleCadastrar', () => {
    it('deve cadastrar um novo usuário com sucesso', async () => {
      const mockData = {
        all: ['existingUser'],
        remaining: ['existingUser']
      };

      mockInteraction.options.getString.mockReturnValue('newUser');

      await handleCadastrar(mockInteraction, mockData);

      expect(mockData.all).toContain('newUser');
      expect(mockData.remaining).toContain('newUser');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('cadastrado com sucesso')
      );
    });

    it('não deve cadastrar um usuário que já existe', async () => {
      const mockData = {
        all: ['existingUser'],
        remaining: ['existingUser']
      };

      mockInteraction.options.getString.mockReturnValue('existingUser');

      await handleCadastrar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('já está cadastrado')
      );
    });
  });

  describe('handleEntrar', () => {
    it('deve cadastrar o usuário atual com sucesso', async () => {
      const mockData = {
        all: ['existingUser'],
        remaining: ['existingUser']
      };

      await handleEntrar(mockInteraction, mockData);

      expect(mockData.all).toContain('testUser');
      expect(mockData.remaining).toContain('testUser');
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('cadastrado com sucesso')
      );
    });

    it('não deve cadastrar o usuário atual se já existir', async () => {
      const mockData = {
        all: ['testUser'],
        remaining: ['testUser']
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
        all: ['user1', 'user2'],
        remaining: ['user1', 'user2']
      };

      mockInteraction.options.getString.mockReturnValue('user1');

      await handleRemover(mockInteraction, mockData);

      expect(mockData.all).not.toContain('user1');
      expect(mockData.remaining).not.toContain('user1');
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
        all: ['user1', 'user2'],
        remaining: ['user2']
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

    it('deve mostrar corretamente usuários pendentes', async () => {
      const mockData = {
        all: ['user1', 'user2', 'user3'],
        remaining: ['user2', 'user3']
      };

      await handleListar(mockInteraction, mockData);

      const reply = mockInteraction.reply.mock.calls[0][0];
      expect(reply.content).toMatch(/Cadastrados:.*user1.*user2.*user3/s);
      expect(reply.content).toMatch(/Ainda não sorteados:.*user2.*user3/s);
    });
  });

  describe('handleSelecionar', () => {
    it('deve selecionar um usuário corretamente', async () => {
      const mockData = {
        all: ['user1', 'user2'],
        remaining: ['user2']
      };

      escolherUsuario.mockReturnValue('user2');

      await handleSelecionar(mockInteraction, mockData);

      expect(escolherUsuario).toHaveBeenCalledWith(mockData);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('user2')
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