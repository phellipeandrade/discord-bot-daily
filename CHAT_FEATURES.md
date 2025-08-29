# 🤖 Hermes - Assistente IA da Equipe Atena

## 📋 Visão Geral

O **Hermes** é o assistente inteligente dedicado da equipe Atena, disponível através de mensagens diretas (DM) no Discord. Ele combina capacidades avançadas de conversação com funcionalidades práticas de lembretes, oferecendo suporte personalizado para as necessidades diárias da equipe.

## 🧠 Funcionalidades de Chat com IA

### **Conversação Contextual e Personalizada**

O Hermes utiliza inteligência artificial avançada para manter conversas naturais e contextualmente relevantes:

- **Histórico de Conversas**: Acessa automaticamente as últimas 5 mensagens do canal DM para manter contexto
- **Personalização**: Utiliza o nome de exibição do usuário para respostas personalizadas
- **Memória de Conversa**: Lembra de tópicos anteriores e referências feitas pelo usuário
- **Identidade Clara**: Se apresenta como Hermes, assistente da equipe Atena, sem mencionar ser uma IA

### **Escopo de Conhecimento**

O Hermes possui conhecimento especializado sobre:

- **Fluxos de Trabalho**: Processos e metodologias da equipe
- **Pipelines e Deploy**: Status e configurações de deployment
- **Boas Práticas**: Padrões e guidelines do projeto
- **Documentação**: Acesso e organização de documentação
- **Tradução**: Suporte para tradução de mensagens e termos técnicos
- **Resumos**: Síntese de tópicos e discussões

### **Características da Conversa**

- **Idioma**: Suporte completo para Português Brasileiro e Inglês
- **Tom**: Profissional, objetivo e amigável
- **Contexto**: Respostas baseadas no histórico recente da conversa
- **Personalização**: Uso do nome de exibição do usuário nas respostas

## ⏰ Sistema de Lembretes Inteligente

### **Configuração Natural de Lembretes**

O Hermes permite configurar lembretes através de linguagem natural:

#### **Expressões de Tempo Suportadas**

**Relativas:**
- "amanhã às 14h"
- "próxima segunda-feira"
- "daqui a 30 minutos"
- "sexta-feira às 16h"

**Específicas:**
- "25 de agosto às 10h"
- "próximo dia 15"
- "final do mês"

#### **Configuração Automática**

- **Fuso Horário**: Interpreta automaticamente no fuso America/Sao_Paulo
- **Horário Padrão**: Se não especificado, usa 09:00 local
- **Dias da Semana**: Usa a próxima ocorrência se a data já passou
- **Validação**: Verifica se o horário é válido e futuro

### **Funcionamento dos Lembretes**

1. **Detecção**: O Hermes identifica automaticamente quando o usuário quer configurar um lembrete
2. **Processamento**: Converte expressões naturais em datas ISO 8601 UTC
3. **Confirmação**: Responde confirmando o lembrete configurado
4. **Notificação**: Envia mensagem privada no horário agendado

#### **Exemplo de Uso**

```
Usuário: "Me lembra de revisar o PR amanhã às 14h"
Hermes: "Ok! Vou te lembrar amanhã às 14h."
[Lembrete configurado para 2025-08-26T17:00:00.000Z UTC]
```

## 🔧 Configuração e Uso

### **Acesso**

- **Canal**: Mensagens diretas (DM) com o bot
- **Disponibilidade**: 24/7
- **Idioma**: Detecta automaticamente o idioma do usuário

### **Requisitos**

- **API Key**: Configuração da chave Gemini API
- **Permissões**: Acesso a mensagens diretas no Discord
- **Histórico**: Acesso às últimas mensagens do canal DM

### **Limitações**

- **Canal**: Funciona apenas em mensagens diretas (não em servidores)
- **Histórico**: Usa apenas as últimas 5 mensagens para contexto
- **Lembretes**: Limitado a um usuário por vez

## 🎯 Benefícios para a Equipe

### **Produtividade**
- Respostas rápidas e contextualizadas
- Configuração natural de lembretes
- Redução de interrupções para perguntas simples

### **Consistência**
- Respostas padronizadas sobre processos
- Documentação sempre atualizada
- Padrões de trabalho consistentes

### **Experiência do Usuário**
- Interface natural através do Discord
- Personalização com nomes de exibição
- Histórico de conversas mantido

## 🔮 Funcionalidades Futuras

- **Integração com Calendário**: Sincronização com Google Calendar
- **Lembretes Recorrentes**: Configuração de lembretes semanais/mensais
- **Análise de Sentimento**: Detecção de humor e tom da conversa
- **Automações**: Integração com ferramentas de CI/CD

---

*O Hermes é o assistente inteligente que torna o trabalho da equipe Atena mais eficiente e organizado, combinando IA avançada com funcionalidades práticas de produtividade.*
