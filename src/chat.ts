import { GoogleGenAI } from '@google/genai';
import { i18n } from '@/i18n';
import { Message } from 'discord.js';
import {
  IntentType,
  IntentClassification,
  ChatResult,
  intentClassificationSchema,
  handleReminderIntent,
  handleTechnicalSupportIntent,
  handleWorkflowHelpIntent,
  handleTranslationIntent,
  handleGeneralQuestionIntent,
  handleTaskManagementIntent,
  handleProjectInfoIntent,
  handleTeamCollaborationIntent,
  handleCodeReviewIntent,
  handleDeploymentIntent,
  handleMonitoringIntent,
  handleDocumentationIntent
} from './intentHandlers';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Classifica a intenção da mensagem do usuário
 */
export async function classifyIntent(
  content: string,
  messageHistory?: Message[]
): Promise<IntentClassification> {
  const lang = i18n.getLanguage() === 'pt-br' ? 'Portuguese' : 'English';
  
  // Construir contexto do histórico
  let historyContext = '';
  if (messageHistory && messageHistory.length > 0) {
    historyContext = '\n\nCONVERSATION HISTORY (most recent first):\n';
    const recentMessages = messageHistory.slice(-3);
    recentMessages.forEach(msg => {
      const role = msg.author.bot ? 'Hermes' : 'User';
      const authorName = msg.author.displayName || msg.author.username;
      historyContext += `${role} (${authorName}): ${msg.content}\n`;
    });
  }

  const classificationPrompt = `
    You are an intent classifier for Hermes, the Atena team's assistant.
    Analyze the user's message and classify their intent.
    User may speak ${lang}.

    INTENT TYPES:
    - reminder: User wants to set, list, or delete reminders
    - general_question: General questions about work, team, or processes
    - technical_support: Technical issues, deployment, pipeline, code problems
    - workflow_help: Questions about workflows, processes, best practices
    - translation: Requests for translation between languages
    - task_management: Creating, listing, updating tasks or to-dos
    - project_info: Questions about project status, metrics, progress
    - team_collaboration: Scheduling meetings, checking availability, team coordination
    - code_review: Requesting or checking code review status
    - deployment: Deploying to environments, checking deployment status
    - monitoring: Checking system status, alerts, performance
    - documentation: Searching or creating documentation
    - unknown: Cannot determine intent or doesn't fit other categories

    EXAMPLES:
    - "me lembre de revisar o PR amanhã" → reminder
    - "lembra de falar com o João" → reminder
    - "me lembre de conversar com o Serginho daqui a 1 minuto" → reminder
    - "remind me to call the client" → reminder
    - "lembra de enviar o email" → reminder
    - "me lembre de fazer a reunião" → reminder
    - "como ver status do deploy?" → technical_support
    - "qual é o fluxo de code review?" → workflow_help
    - "translate this to English" → translation
    - "oi, tudo bem?" → general_question
    - "mostra meus lembretes" → reminder
    - "quais são meus lembretes?" → reminder
    - "deleta lembrete 123" → reminder
    - "remover lembrete" → reminder
    - "criar tarefa para revisar código" → task_management
    - "como está o projeto?" → project_info
    - "agendar reunião amanhã" → team_collaboration
    - "solicitar code review" → code_review
    - "fazer deploy para produção" → deployment
    - "verificar status do sistema" → monitoring
    - "procurar documentação" → documentation

    Return ONLY a JSON object with:
    - intent: one of the intent types above
    - confidence: number between 0 and 1 (how confident you are)
    - subIntent: optional string describing specific sub-intent
    - parameters: optional object with extracted parameters

    ${historyContext}

    Message to classify: ${JSON.stringify(content)}
  `.trim();

  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: classificationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: intentClassificationSchema
      }
    });
    
    return JSON.parse(res.text || '') as IntentClassification;
  } catch (error) {
    return { intent: IntentType.UNKNOWN, confidence: 0 };
  }
}

/**
 * Função principal do chat com classificação de intenções
 */
export async function chatResponse(
  content: string, 
  userId?: string, 
  userName?: string,
  messageHistory?: Message[]
): Promise<ChatResult | null> {
  if (!apiKey) {
    return { reply: i18n.t('reminder.defaultReply') };
  }

  try {
    // Primeiro, classificar a intenção
    const intentClassification = await classifyIntent(content, messageHistory);
    
    // Direcionar para o handler específico baseado na intenção
    switch (intentClassification.intent) {
      case IntentType.REMINDER:
        return await handleReminderIntent(content, userId, userName, messageHistory);
      
      case IntentType.TECHNICAL_SUPPORT:
        return await handleTechnicalSupportIntent(content, userName, messageHistory);
      
      case IntentType.WORKFLOW_HELP:
        return await handleWorkflowHelpIntent(content, userName, messageHistory);
      
      case IntentType.TRANSLATION:
        return await handleTranslationIntent(content, userName, messageHistory);
      
      case IntentType.TASK_MANAGEMENT:
        return await handleTaskManagementIntent(content, userName, messageHistory);
      
      case IntentType.PROJECT_INFO:
        return await handleProjectInfoIntent(content, userName, messageHistory);
      
      case IntentType.TEAM_COLLABORATION:
        return await handleTeamCollaborationIntent(content, userName, messageHistory);
      
      case IntentType.CODE_REVIEW:
        return await handleCodeReviewIntent(content, userName, messageHistory);
      
      case IntentType.DEPLOYMENT:
        return await handleDeploymentIntent(content, userName, messageHistory);
      
      case IntentType.MONITORING:
        return await handleMonitoringIntent(content, userName, messageHistory);
      
      case IntentType.DOCUMENTATION:
        return await handleDocumentationIntent(content, userName, messageHistory);
      
      case IntentType.GENERAL_QUESTION:
        return await handleGeneralQuestionIntent(content, userName, messageHistory);
      
      case IntentType.UNKNOWN:
      default:
        // Para intenções desconhecidas, usar o handler de perguntas gerais
        return await handleGeneralQuestionIntent(content, userName, messageHistory);
    }
  } catch (error) {
    console.error('Error in chatResponse:', error);
    return { reply: i18n.t('reminder.defaultReply') };
  }
}
