# Bot de Seleção Diária do Discord
[Leia esta página em inglês](README.md)

Bot do Discord que seleciona automaticamente um usuário aleatório a cada dia útil e gerencia recomendações musicais. Suporta inglês e português brasileiro.

## Recursos

- Comandos de barra para registrar usuários, listar participantes e gerenciar seleções
- Seleção diária em horário e dias configuráveis (fuso horário e países de feriado podem ser definidos por variáveis de ambiente)
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
canais definidos por `CHANNEL_ID`, `MUSIC_CHANNEL_ID` e `DAILY_VOICE_CHANNEL_ID`.

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` com as seguintes variáveis:

```
DISCORD_TOKEN=seu-token
# Caso omitido, execute `/setup` no seu servidor para definir token, guild e canal.
GUILD_ID=id-da-sua-guild
CHANNEL_ID=id-do-canal-de-mensagens-diarias
MUSIC_CHANNEL_ID=id-do-canal-de-pedidos-de-musica
DAILY_VOICE_CHANNEL_ID=id-do-canal-de-voz-para-tocar-musicas
# Opcional
TIMEZONE=America/Sao_Paulo
BOT_LANGUAGE=en
DAILY_TIME=09:00
DAILY_DAYS=1-5
HOLIDAY_COUNTRIES=BR
USERS_FILE=./src/users.json
ADMIN_IDS=1234567890,0987654321
DATE_FORMAT=YYYY-MM-DD
YOUTUBE_COOKIE=seu-cookie-do-youtube
```
`ADMIN_IDS` deve listar os IDs dos usuários do Discord que iniciam com direitos de administrador. Você também pode editar `serverConfig.json` para gerenciar a lista.
`YOUTUBE_COOKIE` pode ser necessário para vídeos que exibem "Sign in to confirm you're not a bot". Caso a reprodução falhe, o bot tenta usar `ytdl-core` automaticamente.

Defina `BOT_LANGUAGE` como `en` ou `pt-br` para alterar as respostas do bot. `DAILY_TIME` usa o formato 24h `HH:MM` e `DAILY_DAYS` segue a sintaxe de dia da semana do cron (ex.: `1-5` para segunda a sexta). `HOLIDAY_COUNTRIES` é uma lista separada por vírgulas de códigos de país (`BR` e `US` são suportados). `DATE_FORMAT` controla o padrão de data usado pelo comando `/skip-until` e também pode ser alterado via `/setup`.

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
- `remover <nome>` – remove um usuário
- `resetar` – reseta a lista de seleção (ou restaura a lista original)
- `readicionar <nome>` – readiciona um usuário previamente selecionado
- `pular-hoje <nome>` – pula o sorteio de hoje para o usuário informado
- `pular-ate <nome> <data>` – pula a seleção de um usuário até a data especificada (formato definido por `DATE_FORMAT`, padrão `YYYY-MM-DD`)
- `configurar` – configura canais, ID da guild e outras definições. Informe apenas os parâmetros que deseja atualizar.
- `exportar` – exporta arquivos de dados
- `importar` – importa arquivos de dados
- `role <usuario> <role>` – define o papel de um usuário (`admin` ou `user`)


### Controle de acesso

Dois papéis estão disponíveis: **admin** e **user**. Todos os membros listados em `users.json` começam como **user**. Os IDs de administradores são armazenados em `serverConfig.json` e um usuário do Discord não precisa estar registrado para se tornar administrador.

A lista inicial de administradores pode ser fornecida usando a variável de ambiente `ADMIN_IDS` ou o campo `admins` no arquivo de configuração.

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
não possua a reação 🐰, acompanhada de um botão **Play**. Ao pressionar o botão o
bot entra no canal especificado em `DAILY_VOICE_CHANNEL_ID` e toca o áudio. A
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
