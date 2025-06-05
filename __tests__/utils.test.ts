import {
  carregarUsuarios,
  salvarUsuarios,
  escolherUsuario,
  type UserData,
  type UserEntry
} from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('Funções Utilitárias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const dadosMock = {
        all: [{ name: 'Teste', id: '123' }],
        remaining: [{ name: 'Teste', id: '123' }]
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(dadosMock));

      const resultado = carregarUsuarios();
      
      expect(resultado).toEqual(dadosMock);
    });
  });

  describe('escolherUsuario', () => {
    it('deve resetar remaining quando vazio', () => {
      const dados: UserData = {
        all: [{ name: 'Teste', id: '123' }],
        remaining: []
      };

      const resultado = escolherUsuario(dados);
      
      expect(resultado).toBeDefined();
      expect(dados.remaining).toHaveLength(0);
      expect(dados.lastSelected).toBeDefined();
    });

    it('deve escolher usuário aleatoriamente', () => {
      const dados: UserData = {
        all: [
          { name: 'Teste1', id: '123' },
          { name: 'Teste2', id: '456' }
        ],
        remaining: [
          { name: 'Teste1', id: '123' },
          { name: 'Teste2', id: '456' }
        ]
      };

      const resultado = escolherUsuario(dados);
      
      expect(resultado).toBeDefined();
      expect(dados.remaining).toHaveLength(1);
      expect(dados.lastSelected).toEqual(resultado);
    });
  });
}); 