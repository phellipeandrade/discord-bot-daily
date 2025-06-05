import {
  carregarUsuarios,
  salvarUsuarios,
  escolherUsuario,
  type UserData,
  type UserEntry,
  formatarUsuarios
} from '../src/index';
import * as fs from 'fs';
import path from 'path';

// Mock do módulo fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Dados de teste fixos
const TEST_DATA: UserData = {
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
  lastSelected: undefined
};

describe('Funções Utilitárias', () => {
  let mockData: UserData;

  beforeEach(() => {
    jest.clearAllMocks();
    // Cria uma cópia profunda dos dados de teste para cada teste
    mockData = JSON.parse(JSON.stringify(TEST_DATA));
  });

  describe('formatarUsuarios', () => {
    it('deve formatar lista vazia corretamente', () => {
      const lista: UserEntry[] = [];
      expect(formatarUsuarios(lista)).toBe('(nenhum)');
    });

    it('deve formatar lista com um usuário', () => {
      const lista: UserEntry[] = [mockData.all[0]];
      expect(formatarUsuarios(lista)).toBe(`• ${mockData.all[0].name}`);
    });

    it('deve formatar lista com múltiplos usuários', () => {
      const lista: UserEntry[] = mockData.all.slice(0, 3);
      const expected = lista.map(u => `• ${u.name}`).join('\n');
      expect(formatarUsuarios(lista)).toBe(expected);
    });

    it('deve lidar com caracteres especiais nos nomes', () => {
      const lista: UserEntry[] = mockData.all.filter(u => 
        u.name.match(/[áãâàéêíóôõúüçñ]/i)
      );
      const expected = lista.map(u => `• ${u.name}`).join('\n');
      expect(formatarUsuarios(lista)).toBe(expected);
    });

    it('deve manter a ordem da lista original', () => {
      const lista: UserEntry[] = mockData.all.slice(0, 3);
      const expected = lista.map(u => `• ${u.name}`).join('\n');
      expect(formatarUsuarios(lista)).toBe(expected);
    });
  });

  describe('carregarUsuarios', () => {
    it('deve criar arquivo se não existir', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (fs.readFileSync as jest.Mock).mockReturnValue('{"all":[],"remaining":[]}');

      const resultado = carregarUsuarios();
      
      expect(resultado).toEqual({ all: [], remaining: [] });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('deve carregar arquivo existente', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockData));

      const resultado = carregarUsuarios();
      
      expect(resultado).toEqual(mockData);
    });
  });

  describe('salvarUsuarios', () => {
    it('deve salvar corretamente os dados dos usuários', () => {
      salvarUsuarios(mockData);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(mockData, null, 2),
        'utf-8'
      );
    });

    it('deve manter a estrutura correta dos dados', () => {
      let savedData: any;
      (fs.writeFileSync as jest.Mock).mockImplementation((file, data) => {
        savedData = JSON.parse(data as string);
      });

      salvarUsuarios(mockData);

      expect(savedData).toHaveProperty('all');
      expect(savedData).toHaveProperty('remaining');
      expect(Array.isArray(savedData.all)).toBe(true);
      expect(Array.isArray(savedData.remaining)).toBe(true);
      expect(savedData.all[0]).toHaveProperty('name');
      expect(savedData.all[0]).toHaveProperty('id');
    });
  });

  describe('escolherUsuario', () => {
    it('deve resetar remaining quando vazio', () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      dados.remaining = [];

      const resultado = escolherUsuario(dados);
      
      expect(resultado).toBeDefined();
      expect(dados.remaining.length).toBeLessThan(mockData.all.length);
      expect(dados.lastSelected).toBeDefined();
    });

    it('deve escolher usuário aleatoriamente', () => {
      const dados = JSON.parse(JSON.stringify(mockData));
      const remainingAntes = dados.remaining.length;

      const resultado = escolherUsuario(dados);
      
      expect(resultado).toBeDefined();
      expect(dados.remaining.length).toBe(remainingAntes - 1);
      expect(dados.lastSelected).toEqual(resultado);
    });
  });
}); 