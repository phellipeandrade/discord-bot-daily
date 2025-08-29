# Comandos em Linguagem Natural

O bot agora suporta comandos em linguagem natural usando IA (Google Gemini). Você pode interagir com o bot usando frases naturais em português ou inglês.

## Como Funciona

O bot analisa suas mensagens em DM (mensagens privadas) e tenta interpretar sua intenção. Se detectar um comando válido com alta confiança (>70%), ele executará a ação correspondente.

## Comandos Suportados

### Gerenciar Usuários

**Registrar usuário:**
- "registra o João"
- "register João"
- "adiciona a Maria"
- "add Pedro"

**Remover usuário:**
- "remove o João"
- "remove João"
- "deleta a Maria"
- "delete Pedro"

**Readicionar usuário:**
- "readiciona o João"
- "readd João"
- "coloca o Pedro de volta"
- "put Maria back"

### Pular Seleções

**Pular hoje:**
- "pula o João hoje"
- "skip João today"
- "não sorteia a Maria hoje"
- "don't select Pedro today"

**Pular até uma data:**
- "pula o João até amanhã"
- "skip João until tomorrow"
- "pula a Maria até 15/01/2024"
- "skip Pedro until 2024-01-15"
- "não sorteia o João até segunda-feira"
- "don't select Maria until Monday"

### Configurações

**Configurar canal:**
- "configura o canal para #geral"
- "set channel to #general"
- "muda o canal para #daily"
- "change channel to #meetings"

**Configurar horário:**
- "configura o horário para 14:30"
- "set time to 14:30"
- "muda o horário para 9:00"
- "change time to 9:00"

**Configurar fuso horário:**
- "configura o fuso horário para America/Sao_Paulo"
- "set timezone to America/Sao_Paulo"
- "muda o fuso para UTC"
- "change timezone to UTC"

**Configurar idioma:**
- "configura o idioma para pt-br"
- "set language to pt-br"
- "muda o idioma para en"
- "change language to en"

### Ajuda

**Obter ajuda:**
- "ajuda"
- "help"
- "como usar"
- "como funciona"

## Exemplos de Uso

### Cenário 1: Gerenciamento de Usuários
```
Usuário: "registra o João Silva"
Bot: ✅ Usuário João Silva foi registrado com sucesso!

Usuário: "pula o João hoje"
Bot: ✅ João Silva não será sorteado(a) hoje.

Usuário: "pula a Maria até amanhã"
Bot: ✅ Maria não será sorteado(a) até 16/01/2024.
```

### Cenário 2: Configuração
```
Usuário: "configura o horário para 10:00"
Bot: ✅ Configuração atualizada: dailyTime = 10:00

Usuário: "muda o canal para #daily"
Bot: ✅ Configuração atualizada: channelId = #daily
```

### Cenário 3: Ajuda
```
Usuário: "ajuda"
Bot: 🤖 Comandos em Linguagem Natural

Você pode usar linguagem natural para interagir comigo! Exemplos:

**Gerenciar Usuários:**
• "registra o João" / "register João"
• "remove a Maria" / "remove Maria"
• "readiciona o Pedro" / "readd Pedro"

**Pular Seleções:**
• "pula o João hoje" / "skip João today"
• "pula a Maria até amanhã" / "skip Maria until tomorrow"
• "pula o Pedro até 15/01/2024" / "skip Pedro until 2024-01-15"

**Configurações:**
• "configura o canal para #geral" / "set channel to #general"
• "configura o horário para 14:30" / "set time to 14:30"
• "configura o fuso horário para America/Sao_Paulo" / "set timezone to America/Sao_Paulo"

**Ajuda:**
• "ajuda" / "help" / "como usar"

💡 **Dica:** Quanto mais específico você for, melhor eu entendo!
```

## Requisitos

- **API Key do Google Gemini**: Configure a variável de ambiente `GEMINI_API_KEY`
- **Permissões de Admin**: Alguns comandos requerem permissões de administrador
- **Mensagens Privadas**: Os comandos funcionam apenas em DM com o bot

## Limitações

- **Confiança Mínima**: Comandos com confiança < 70% são ignorados
- **Contexto Limitado**: O bot não mantém contexto de conversas longas
- **Idiomas**: Suporta português brasileiro e inglês
- **Permissões**: Comandos administrativos requerem permissões adequadas

## Troubleshooting

### O bot não responde aos comandos
1. Verifique se a `GEMINI_API_KEY` está configurada
2. Confirme que está enviando a mensagem em DM
3. Tente ser mais específico na sua solicitação

### Comando não reconhecido
1. Use frases mais claras e diretas
2. Verifique se o comando está na lista de suportados
3. Tente usar sinônimos ou variações

### Erro de permissão
1. Verifique se você tem permissões de administrador
2. Confirme que seu ID está na lista de admins no `serverConfig.json`

## Desenvolvimento

### Adicionando Novos Comandos

Para adicionar novos comandos em linguagem natural:

1. Adicione o novo tipo em `NaturalCommandType`
2. Atualize o schema de classificação
3. Implemente a função handler correspondente
4. Adicione exemplos no prompt do Gemini
5. Crie testes para a nova funcionalidade

### Estrutura do Código

- `src/naturalLanguage.ts`: Lógica principal de interpretação
- `src/chatHandler.ts`: Integração com o sistema de chat
- `src/i18n/`: Traduções para português e inglês
- `src/__tests__/naturalLanguage.test.ts`: Testes unitários

## Contribuição

Para contribuir com melhorias nos comandos em linguagem natural:

1. Teste com diferentes frases e contextos
2. Adicione novos exemplos ao prompt do Gemini
3. Melhore a precisão da classificação
4. Adicione suporte para mais idiomas
5. Implemente novos tipos de comandos
