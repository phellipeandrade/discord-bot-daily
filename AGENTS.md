# Guia de Contribuição dos Agentes

Este repositório contém um bot do Discord escrito em TypeScript e requer Node.js >= 18.

## Checks obrigatórios

Antes de realizar commits, sempre execute:

```bash
npm run lint
npm test
npm run build-zip
unzip -l bot.zip
NODE_ENV=test node build/index.js
```
Esses comandos verificam formatação, regras de lint, executam a suíte de testes do Jest e geram o pacote de produção. Depois confira o conteúdo do `bot.zip` e execute o projeto em ambiente de teste para garantir que não há erros de runtime. Só faça commit quando todas as verificações passarem e o build e a execução concluírem com sucesso. O projeto não deve apresentar erros ou warnings no processo de linter.

## Mensagens de commit

As mensagens devem seguir o padrão Conventional Commits. Exemplos:

- `feat: adicionar funcionalidade`
- `fix: corrigir problema`
- `docs: atualizar documentação`

## Código

- Utilize tipagem forte e mantenha o código limpo e claro.
- Adicione testes para todo novo recurso ou correção de bug.
- O código deve seguir sempre os padrões e ser escrito em Inglês

## Escopo

Essas diretrizes se aplicam a todo o repositório.
