# Sistema de Classificação de Intenções

## Visão Geral

O sistema de chat do Hermes foi refatorado para implementar um fluxo de classificação de intenções seguido de prompts específicos para cada tipo de intenção. Isso melhora a qualidade das respostas e permite um tratamento mais especializado para diferentes tipos de solicitações.

## Fluxo do Sistema

### 1. Classificação de Intenção
A primeira etapa é classificar a intenção da mensagem do usuário usando um modelo de IA especializado. O classificador analisa o conteúdo e contexto para determinar a categoria mais apropriada.

### 2. Roteamento para Handler Específico
Baseado na intenção classificada, a mensagem é direcionada para um handler específico que possui um prompt otimizado para aquele tipo de solicitação.

## Tipos de Intenções

### `IntentType.REMINDER`
**Descrição**: Solicitações relacionadas a lembretes
**Exemplos**:
- "me lembre de revisar o PR amanhã"
- "mostra meus lembretes"
- "deleta lembrete 123"
- "remover todos os lembretes"
- "apagar todos os meus lembretes"

**Handler**: `handleReminderIntent()`
**Funcionalidades**:
- Criar lembretes com data/hora
- Listar lembretes existentes
- Deletar lembretes específicos por ID
- Deletar todos os lembretes do usuário
- Processamento de expressões temporais relativas

### `IntentType.TECHNICAL_SUPPORT`
**Descrição**: Problemas técnicos e suporte
**Exemplos**:
- "como ver status do deploy?"
- "build falhou"
- "problema no ambiente"
- "como debugar isso?"

**Handler**: `handleTechnicalSupportIntent()`
**Funcionalidades**:
- Troubleshooting de deployment
- Análise de problemas de pipeline
- Debugging de código
- Configuração de ambiente

### `IntentType.WORKFLOW_HELP`
**Descrição**: Ajuda com processos e workflows
**Exemplos**:
- "qual é o fluxo de code review?"
- "como fazer deploy?"
- "melhores práticas para testes?"
- "como documentar isso?"

**Handler**: `handleWorkflowHelpIntent()`
**Funcionalidades**:
- Explicação de processos de code review
- Workflows de deployment
- Metodologias de teste
- Padrões de documentação

### `IntentType.TRANSLATION`
**Descrição**: Solicitações de tradução
**Exemplos**:
- "translate this to English: 'alinha com o PO'"
- "como dizer 'deploy' em português?"
- "traduz 'code review'"

**Handler**: `handleTranslationIntent()`
**Funcionalidades**:
- Tradução entre português e inglês
- Contexto técnico e de negócio
- Múltiplas opções quando apropriado
- Explicação de nuances culturais

### `IntentType.GENERAL_QUESTION`
**Descrição**: Perguntas gerais sobre o time e trabalho
**Exemplos**:
- "oi, tudo bem?"
- "como está o projeto?"
- "quais ferramentas vocês usam?"
- "como funciona o time?"

**Handler**: `handleGeneralQuestionIntent()`
**Funcionalidades**:
- Informações sobre o time
- Status de projetos
- Ferramentas utilizadas
- Conversas casuais

### `IntentType.UNKNOWN`
**Descrição**: Intenção não identificada
**Handler**: Redirecionado para `handleGeneralQuestionIntent()`

## Estrutura do Código

### Interfaces

```typescript
interface IntentClassification {
  intent: IntentType;
  confidence: number;
  subIntent?: string;
}

interface ChatResult {
  reply: string;
  intent?: {
    setReminder?: {
      date: string;
      message: string;
    };
    listReminders?: boolean;
    deleteReminder?: {
      id: number;
    };
    deleteAllReminders?: boolean;
  };
}
```

### Funções Principais

1. **`classifyIntent()`**: Classifica a intenção da mensagem
2. **`handleReminderIntent()`**: Processa solicitações de lembretes
3. **`handleTechnicalSupportIntent()`**: Processa suporte técnico
4. **`handleWorkflowHelpIntent()`**: Processa ajuda com workflows
5. **`handleTranslationIntent()`**: Processa traduções
6. **`handleGeneralQuestionIntent()`**: Processa perguntas gerais
7. **`chatResponse()`**: Função principal que orquestra o fluxo

## Vantagens do Novo Sistema

### 1. Respostas Mais Especializadas
Cada tipo de intenção possui um prompt otimizado, resultando em respostas mais precisas e relevantes.

### 2. Melhor Contextualização
Os prompts específicos incluem exemplos e diretrizes relevantes para cada domínio.

### 3. Manutenibilidade
Cada handler pode ser modificado independentemente sem afetar os outros.

### 4. Escalabilidade
Novos tipos de intenção podem ser facilmente adicionados seguindo o padrão estabelecido.

### 5. Debugging Melhorado
O sistema de classificação permite identificar melhor onde ocorrem problemas.

## Configuração de Prompts

Cada handler possui seu próprio prompt que inclui:

- **Contexto do usuário**: Nome e ID do usuário
- **Histórico de conversa**: Últimas mensagens para contexto
- **Diretrizes específicas**: Regras e exemplos para o domínio
- **Estilo de resposta**: Tom e formato apropriados
- **Schema de resposta**: Estrutura JSON esperada

## Monitoramento e Logs

O sistema inclui logs para:
- Classificação de intenções
- Confiança da classificação
- Erros em handlers específicos
- Performance geral

## Exemplos de Uso

```typescript
// Exemplo de uso da função principal
const result = await chatResponse(
  "me lembre de revisar o PR amanhã às 14h",
  "user123",
  "João Silva",
  messageHistory
);

// Resultado esperado para lembrete
{
  reply: "Ok! Vou te lembrar amanhã às 14h.",
  intent: {
    setReminder: {
      date: "2025-08-26T17:00:00.000Z",
      message: "Revisar o PR"
    }
  }
}

// Exemplo de deletar todos os lembretes
const result = await chatResponse(
  "remover todos os lembretes",
  "user123",
  "João Silva",
  messageHistory
);

// Resultado esperado para deletar todos os lembretes
{
  reply: "Ok, Phellipe, todos os seus lembretes foram removidos.",
  intent: {
    deleteAllReminders: true
  }
}
```

## Considerações de Performance

- A classificação adiciona uma chamada extra à API
- O histórico de conversa é limitado para otimizar performance
- Handlers específicos podem ter contextos menores
- Cache de classificações pode ser implementado no futuro

## Próximos Passos

1. **Métricas**: Implementar métricas de acurácia da classificação
2. **Cache**: Adicionar cache para classificações frequentes
3. **Novos Intents**: Expandir para mais tipos de intenção
4. **Feedback**: Sistema de feedback para melhorar classificação
5. **A/B Testing**: Testar diferentes prompts para otimização
