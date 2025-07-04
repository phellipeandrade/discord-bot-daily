# Bot de Seleção Diária do Discord
[Leia esta página em inglês](README.md)

Bot do Discord que seleciona automaticamente um usuário aleatório a cada dia útil e gerencia recomendações musicais. Suporta inglês e português brasileiro.

## Recursos

- Comandos de barra para registrar usuários, listar participantes e gerenciar seleções
- Seleção diária em horário e dias configuráveis (fuso horário e países de feriado são definidos em `serverConfig.json`)
- Nomes dos comandos também estão disponíveis em português (pt-br)
- Utilidades de música para tocar músicas diretamente em um canal de voz (inclui comando para parar)
- Respostas multilíngues opcionais (inglês por padrão e português-BR disponível)

## Requisitos

- Node.js >= 18
- Token do bot do Discord e permissões para registrar comandos slash (/comando)

## Configuração no Discord

Convide o bot usando os escopos `bot` e `applications.commands` e garanta as
seguintes permissões:

- Enviar mensagens
- Ler histórico de mensagens
- Adicionar reações
- Gerenciar mensagens (necessário para `/limpar-coelhos`)
- Inserir links e anexos
- Conectar e falar em canais de voz
- Usar comandos de aplicação

Esse conjunto de permissões corresponde ao inteiro `3270720`.
Ative também a **Message Content Intent** no portal de desenvolvedores do
Discord e certifique-se de que o papel do bot possa visualizar e interagir nos
canais definidos por `CHANNEL_ID` e `MUSIC_CHANNEL_ID`. Caso deseje usar o
player de música, garanta também acesso ao canal de voz configurado em
`DAILY_VOICE_CHANNEL_ID`.

## Instalação

```bash
npm install
```

## Configuração

Copie `src/serverConfig.sample.json` para `src/serverConfig.json` e
preencha os valores desejados. Todas as configurações como token,
IDs de guild e canais são lidas desse arquivo. Somente `NODE_ENV` e
`USERS_FILE` são lidos de variáveis de ambiente.

`USERS_FILE` pode apontar para um caminho personalizado de dados dos
usuários; caso contrário o padrão `src/users.json` será utilizado.

O campo `admins` em `serverConfig.json` define quais IDs de usuário do
Discord começam com direitos de administrador.


Defina `BOT_LANGUAGE` como `en` ou `pt-br` para alterar as respostas do bot. `DAILY_TIME` usa o formato 24h `HH:MM` e `DAILY_DAYS` segue a sintaxe de dia da semana do cron (ex.: `1-5` para segunda a sexta). `HOLIDAY_COUNTRIES` é uma lista separada por vírgulas de códigos de país (`BR` e `US` são suportados). `DATE_FORMAT` controla o padrão de data usado pelo comando `/skip-until` e também pode ser alterado via `/setup`. O idioma `pt-br` usa por padrão `DD-MM-YYYY`.
`DISABLED_UNTIL` permite definir uma data ISO para pausar os anúncios diários até esse dia.

## Uso

Execute localmente em modo de desenvolvimento:

```bash
npm run dev
```

### Testes e cobertura

Execute a suíte de testes:

```bash
npm test
```

Gere um relatório de cobertura e badge:

```bash
npm run test:coverage
```

Construa e inicie:

```bash
npm run build
npm start
```

Para criar um zip de produção com traduções e dados:

```bash
npm run build-zip
```

Esse arquivo inclui `serverConfig.json` usado pelo comando `/setup` para armazenar informações de guild e canal.

O arquivo `xhr-sync-worker.js` necessário pelo jsdom também é incluído para evitar erros em tempo de execução.

### Comandos

**Usuário**

- `entrar` – auto-registro usando seu nome do Discord
- `listar` – mostra usuários registrados, pendentes e já selecionados
- `selecionar` – seleciona manualmente um usuário aleatório
- `proxima-musica` – mostra a próxima música não tocada do canal de pedidos
- `parar-musica` – interrompe a reprodução atual

**Admin**

- `registrar <nome>` – registra um usuário pelo nome
- `limpar-coelhos` – remove reações de coelhinho adicionadas pelo bot
- `verificar-config` – verifica se a configuração do bot está completa.
- `remover <usuario>` – remove um usuário (menção, id ou nome)
- `resetar` – reseta a lista de seleção (ou restaura a lista original)
- `readicionar <usuario>` – readiciona um usuário previamente selecionado (menção, id ou nome)
- `pular-hoje <usuario>` – pula o sorteio de hoje para o usuário informado (menção, id ou nome)
- `pular-ate <usuario> <data>` – pula a seleção de um usuário até a data especificada (formato definido por `DATE_FORMAT`, padrão `DD-MM-YYYY`; usuário pode ser menção, id ou nome)
- `desativar` – desativa os anúncios diários por tempo indeterminado
- `desativar-ate <data>` – desativa os anúncios diários até a data informada (formato definido por `DATE_FORMAT`, padrão `DD-MM-YYYY`)
- `ativar` – reativa os anúncios diários
- `configurar` – configura canais, ID da guild e outras definições. Informe apenas os parâmetros que deseja atualizar.
- `exportar` – exporta arquivos de dados
- `importar` – importa arquivos de dados
- `role <usuario> <role>` – define o papel de um usuário (`admin` ou `user`)


### Controle de acesso

Dois papéis estão disponíveis: **admin** e **user**. Todos os membros listados em `users.json` começam como **user**. Os IDs de administradores são armazenados em `serverConfig.json` e um usuário do Discord não precisa estar registrado para se tornar administrador.

A lista inicial de administradores deve ser definida no campo `admins` do arquivo `serverConfig.json`.

Somente administradores podem executar comandos privilegiados como `/registrar`, `/limpar-coelhos`, `/verificar-config`, `/configurar`, `/importar`, `/exportar`, `/pular-*` e o próprio `/role`. Usuários comuns ainda podem usar comandos básicos como `/entrar`, `/listar`, `/selecionar`, `/proxima-musica` e `/parar-musica`.

Use o comando `/role` para conceder ou revogar acesso de administrador:

```bash
/role @usuario admin    # concede direitos de admin
/role @usuario user     # remove direitos de admin
```

O controle de permissões é feito pela [`@rbac/rbac`](https://www.npmjs.com/package/@rbac/rbac) biblioteca.

### Player de música

O bot busca músicas no canal definido por `MUSIC_CHANNEL_ID`. O comando `/proxima-musica`
responde com a próxima mensagem que contenha um link, anexo ou embed e que ainda
não possua a reação 🐰, acompanhada de um botão **Play**. Se `DAILY_VOICE_CHANNEL_ID`
estiver configurado, ao pressionar o botão o bot entrará nesse canal de voz e tocará
o áudio. Se `PLAYER_FORWARD_COMMAND` estiver configurado, em vez de tocar diretamente,
o bot responderá com um comando para você copiar e colar em outro bot player. A
mensagem original recebe a reação 🐰 para que não seja reproduzida novamente.

Use `/parar-musica` para interromper a reprodução atual. Administradores podem
remover todas as reações de coelho com `/limpar-coelhos` se necessário.



## Testes

```bash
npm test
```

## Desenvolvimento

O projeto utiliza o [Husky](https://typicode.github.io/husky) para executar
verificações antes de cada commit. O *hook* `pre-commit` roda `npm run lint`,
que valida o ESLint, o formato do Prettier e os erros de TypeScript. As mensagens
de commit são verificadas pelo Commitlint.

## Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).
