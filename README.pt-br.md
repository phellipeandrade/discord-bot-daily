# Bot de Seleção Diária do Discord
[Leia esta página em inglês](README.md)

Bot do Discord que seleciona automaticamente um usuário aleatório a cada dia útil e gerencia recomendações musicais. Suporta inglês e português brasileiro.

## Recursos

- Comandos de barra para registrar usuários, listar participantes e gerenciar seleções
- Seleção diária em horário e dias configuráveis (fuso horário e países de feriado podem ser definidos por variáveis de ambiente)
- Utilidades de música para obter a próxima música não tocada de um canal
- Respostas multilíngues opcionais (inglês por padrão e português-BR disponível)

## Requisitos

- Node.js >= 18
- Token do bot do Discord e permissões para registrar comandos slash (/comando)

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
# Opcional
TIMEZONE=America/Sao_Paulo
BOT_LANGUAGE=en
DAILY_TIME=09:00
DAILY_DAYS=1-5
HOLIDAY_COUNTRIES=BR
USERS_FILE=./src/users.json
DATE_FORMAT=YYYY-MM-DD
```

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

- `registrar <nome>` – registra um usuário pelo nome **(admin)**
- `entrar` – auto-registro usando seu nome do Discord
- `remover <nome>` – remove um usuário
- `listar` – mostra usuários registrados, pendentes e já selecionados
- `selecionar` – seleciona manualmente um usuário aleatório
- `resetar` – reseta a lista de seleção (ou restaura a lista original)
- `proxima-musica` – mostra a próxima música não tocada do canal de pedidos
- `limpar-coelhos` – remove reações de coelhinho adicionadas pelo bot **(admin)**
- `readicionar <nome>` – readiciona um usuário previamente selecionado
- `pular-hoje <nome>` – pula o sorteio de hoje para o usuário informado
- `pular-ate <nome> <data>` – pula a seleção de um usuário até a data especificada (formato definido por `DATE_FORMAT`, padrão `YYYY-MM-DD`)
- `configurar` – configura canais, horário e outras definições. Informe apenas os parâmetros que deseja atualizar.
- `verificar-config` – verifica se a configuração do bot está completa **(admin)**

Os comandos marcados com **(admin)** só podem ser executados por administradores.

## Testes

```bash
npm test
```

## Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).
