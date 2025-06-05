const fs = require('fs');
const index = require('../src/index.ts');
const {
  handleCadastrar,
  handleEntrar,
  handleRemover,
  handleListar,
  handleSelecionar,
} = index;

// Mock das funções utilitárias
const escolherUsuarioMock = jest.spyOn(index, 'escolherUsuario');
const carregarUsuariosMock = jest.spyOn(index, 'carregarUsuarios');
const salvarUsuariosMock = jest.spyOn(index, 'salvarUsuarios');

// Dados de teste fixos
const TEST_DATA = {
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

describe('Comandos do Bot', () => {
  let mockInteraction;
  let mockData;

  beforeEach(() => {
    // Reset todos os mocks antes de cada teste
    jest.clearAllMocks();

    // Mock básico da interaction
    mockInteraction = {
      reply: jest.fn(),
      options: {
        getString: jest.fn()
      },
      user: {
        username: 'testUser',
        id: '123456'
      }
    };

    // Cria uma cópia profunda dos dados de teste para cada teste
    mockData = JSON.parse(JSON.stringify(TEST_DATA));
  });

  describe('handleCadastrar', () => {
    it('deve cadastrar um novo usuário com sucesso', async () => {
      const novoUsuario = { name: 'newUser', id: '123456' };
      mockInteraction.options.getString.mockReturnValue(novoUsuario.name);

      await handleCadastrar(mockInteraction, mockData);

      expect(mockData.all.some(u => u.name === novoUsuario.name && u.id === novoUsuario.id)).toBe(true);
      expect(mockData.remaining.some(u => u.name === novoUsuario.name && u.id === novoUsuario.id)).toBe(true);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('cadastrado com sucesso')
      );
    });

    it('não deve cadastrar um usuário que já existe', async () => {
      const usuarioExistente = mockData.all[0];
      mockInteraction.user.id = usuarioExistente.id;
      mockInteraction.options.getString.mockReturnValue('newUser');

      await handleCadastrar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('já está cadastrado')
      );
    });
  });

  describe('handleEntrar', () => {
    it('deve cadastrar o usuário atual com sucesso', async () => {
      const novoUsuario = { name: 'testUser', id: '123456' };

      await handleEntrar(mockInteraction, mockData);

      expect(mockData.all.some(u => u.name === novoUsuario.name && u.id === novoUsuario.id)).toBe(true);
      expect(mockData.remaining.some(u => u.name === novoUsuario.name && u.id === novoUsuario.id)).toBe(true);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('cadastrado com sucesso')
      );
    });

    it('não deve cadastrar o usuário atual se já existir', async () => {
      const usuarioExistente = mockData.all[0];
      mockInteraction.user.id = usuarioExistente.id;

      await handleEntrar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('já está cadastrado')
      );
    });
  });

  describe('handleRemover', () => {
    it('deve remover um usuário com sucesso', async () => {
      const usuarioParaRemover = mockData.all[0];
      mockInteraction.options.getString.mockReturnValue(usuarioParaRemover.name);

      const allAntes = mockData.all.length;
      const remainingAntes = mockData.remaining.length;

      await handleRemover(mockInteraction, mockData);

      expect(mockData.all.length).toBe(allAntes - 1);
      expect(mockData.remaining.length).toBe(remainingAntes - 1);
      expect(mockData.all.some(u => u.name === usuarioParaRemover.name)).toBe(false);
      expect(mockData.remaining.some(u => u.name === usuarioParaRemover.name)).toBe(false);
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringContaining('removido com sucesso')
      );
    });

    it('deve informar quando tentar remover um usuário que não existe', async () => {
      const allAntes = [...mockData.all];
      const remainingAntes = [...mockData.remaining];

      mockInteraction.options.getString.mockReturnValue('nonexistentUser');

      await handleRemover(mockInteraction, mockData);

      expect(mockData.all).toEqual(allAntes);
      expect(mockData.remaining).toEqual(remainingAntes);
    });
  });

  describe('handleListar', () => {
    it('deve listar usuários corretamente com formatação', async () => {
      await handleListar(mockInteraction, mockData);

      const reply = mockInteraction.reply.mock.calls[0][0];
      expect(reply).toEqual({
        content: expect.stringMatching(/📋 \*\*Cadastrados:\*\*\n• /),
        flags: 64
      });
    });

    it('deve mostrar mensagem apropriada quando não há usuários', async () => {
      mockData.all = [];
      mockData.remaining = [];

      await handleListar(mockInteraction, mockData);

      expect(mockInteraction.reply).toHaveBeenCalledWith({
        content: "📋 **Cadastrados:**\n(nenhum)\n\n🔄 **Ainda não sorteados:**\n(nenhum)\n\n✅ **Já sorteados:**\n(nenhum)",
        flags: 64
      });
    });

    it('deve mostrar corretamente usuários pendentes e já sorteados', async () => {
      // Remove alguns usuários da lista remaining para simular sorteados
      mockData.remaining = mockData.remaining.slice(2);

      await handleListar(mockInteraction, mockData);

      const reply = mockInteraction.reply.mock.calls[0][0];
      expect(reply.content).toMatch(/📋 \*\*Cadastrados:\*\*/);
      expect(reply.content).toMatch(/🔄 \*\*Ainda não sorteados:\*\*/);
      expect(reply.content).toMatch(/✅ \*\*Já sorteados:\*\*/);
    });

    it('deve manter a ordem correta das seções', async () => {
      await handleListar(mockInteraction, mockData);

      const reply = mockInteraction.reply.mock.calls[0][0];
      const sections = reply.content.split('\n\n');
      
      expect(sections[0]).toContain('📋 **Cadastrados:**');
      expect(sections[1]).toContain('🔄 **Ainda não sorteados:**');
      expect(sections[2]).toContain('✅ **Já sorteados:**');
    });

    it('deve lidar com caracteres especiais nos nomes', async () => {
      await handleListar(mockInteraction, mockData);

      const reply = mockInteraction.reply.mock.calls[0][0];
      const usuariosComAcentos = mockData.all.filter(u => 
        u.name.match(/[áãâàéêíóôõúüçñ]/i)
      );

      for (const usuario of usuariosComAcentos) {
        expect(reply.content).toMatch(new RegExp(`• ${usuario.name}`));
      }
    });

    it('deve manter a formatação mesmo com lista vazia de já sorteados', async () => {
      await handleListar(mockInteraction, mockData);

      const reply = mockInteraction.reply.mock.calls[0][0];
      expect(reply.content).toMatch(/✅ \*\*Já sorteados:\*\*\n\(nenhum\)/);
    });
  });

  describe('handleSelecionar', () => {
    it('deve selecionar um usuário corretamente', async () => {
      await handleSelecionar(mockInteraction, mockData);

      // Verifica se a resposta está no formato correto
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringMatching(/🎯 O próximo selecionado é: <@\d+> \(\*\*[^*]+\*\*\)/)
      );

      // Verifica se o usuário selecionado foi removido da lista remaining
      expect(mockData.remaining.length).toBe(mockData.all.length - 1);
    });

    it('deve recarregar a lista quando não houver mais usuários disponíveis', async () => {
      mockData.remaining = [];
      const allLength = mockData.all.length;

      await handleSelecionar(mockInteraction, mockData);

      // Verifica se a lista foi recarregada
      expect(mockData.remaining.length).toBe(allLength - 1);

      // Verifica se a resposta está no formato correto
      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.stringMatching(/🎯 O próximo selecionado é: <@\d+> \(\*\*[^*]+\*\*\)/)
      );
    });

    it('deve selecionar usuários de forma aleatória', async () => {
      // Armazena os IDs dos usuários selecionados em 50 tentativas
      const selectedIds = new Set();
      const numTentativas = 50;
      
      // Faz várias seleções
      for (let i = 0; i < numTentativas; i++) {
        // Reseta a lista remaining antes de cada seleção
        mockData.remaining = [...mockData.all];
        
        await handleSelecionar(mockInteraction, mockData);
        
        // Extrai o ID do usuário da mensagem de resposta
        const match = mockInteraction.reply.mock.calls[i][0].match(/<@(\d+)>/);
        if (match) {
          selectedIds.add(match[1]);
        }
      }

      // Verifica se pelo menos 80% dos usuários foram selecionados
      const minExpectedUnique = Math.floor(mockData.all.length * 0.8);
      expect(selectedIds.size).toBeGreaterThanOrEqual(minExpectedUnique);
    });
  });
}); 