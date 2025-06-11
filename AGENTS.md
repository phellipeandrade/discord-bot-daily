# Guia de Contribuição dos Agentes

Este repositório contém um bot do Discord escrito em TypeScript e requer Node.js >= 18.

## Checks obrigatórios

Antes de realizar commits, sempre execute:

```bash
npm run lint
npm test
```

Esses comandos verificam formatação, regras de lint e executam a suíte de testes do Jest. Só faça commit quando todas as verificações passarem.

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
