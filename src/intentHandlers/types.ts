import { Message } from 'discord.js';

// Tipos de intenções suportadas
export enum IntentType {
  REMINDER = 'reminder',
  GENERAL_QUESTION = 'general_question',
  TECHNICAL_SUPPORT = 'technical_support',
  WORKFLOW_HELP = 'workflow_help',
  TRANSLATION = 'translation',
  TASK_MANAGEMENT = 'task_management',
  PROJECT_INFO = 'project_info',
  TEAM_COLLABORATION = 'team_collaboration',
  CODE_REVIEW = 'code_review',
  DEPLOYMENT = 'deployment',
  MONITORING = 'monitoring',
  DOCUMENTATION = 'documentation',
  UNKNOWN = 'unknown'
}

// Interface para classificação de intenção
export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  subIntent?: string;
  parameters?: Record<string, unknown>;
}

// Interface para ações específicas de cada intent
export interface IntentActions {
  // Reminder actions
  setReminder?: {
    date: string;
    message: string;
  };
  listReminders?: {
    date?: string;
    message?: string;
    description?: string;
  };
  deleteReminders?: {
    ids?: number[];
    message?: string;
    date?: string;
    description?: string;
    count?: number;
  };
  deleteAllReminders?: boolean;
  
  // Task management actions
  createTask?: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    assignee?: string;
  };
  listTasks?: {
    status?: 'pending' | 'in_progress' | 'completed';
    assignee?: string;
  };
  updateTask?: {
    id: number;
    status?: 'pending' | 'in_progress' | 'completed';
    title?: string;
    description?: string;
  };
  
  // Project info actions
  getProjectStatus?: {
    projectId?: string;
  };
  getProjectMetrics?: {
    projectId?: string;
    metricType?: 'progress' | 'velocity' | 'quality';
  };
  
  // Team collaboration actions
  scheduleMeeting?: {
    date: string;
    duration?: number;
    participants?: string[];
    topic?: string;
  };
  getTeamAvailability?: {
    date?: string;
  };
  
  // Code review actions
  requestCodeReview?: {
    prUrl?: string;
    reviewers?: string[];
    priority?: 'low' | 'medium' | 'high';
  };
  getReviewStatus?: {
    prId?: string;
  };
  
  // Deployment actions
  deployToEnvironment?: {
    environment: 'staging' | 'production';
    version?: string;
  };
  getDeploymentStatus?: {
    deploymentId?: string;
  };
  
  // Monitoring actions
  getSystemStatus?: {
    service?: string;
  };
  getAlerts?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Documentation actions
  searchDocs?: {
    query: string;
    category?: string;
  };
  createDoc?: {
    title: string;
    content: string;
    category?: string;
  };
}

// Interface para resultado do chat
export interface ChatResult {
  reply: string;
  intent?: IntentActions;
  metadata?: {
    confidence: number;
    suggestedActions?: string[];
    requiresConfirmation?: boolean;
    deletedReminders?: {
      count: number;
      ids: number[];
      messages: string[];
    };
  };
}

// Interface para contexto do handler
export interface HandlerContext {
  content: string;
  userId?: string;
  userName?: string;
  messageHistory?: Message[];
  lang: string;
  historyContext: string;
  userContext: string;
}

// Schema para classificação de intenção
export const intentClassificationSchema = {
  type: 'object',
  properties: {
    intent: { 
      type: 'string',
      enum: Object.values(IntentType)
    },
    confidence: { 
      type: 'number',
      minimum: 0,
      maximum: 1
    },
    subIntent: { type: 'string' },
    parameters: { 
      type: 'object',
      additionalProperties: true,
      properties: {
        // Propriedades opcionais para parâmetros extraídos
        date: { type: 'string' },
        message: { type: 'string' },
        id: { type: 'number' }
      }
    }
  },
  required: ['intent', 'confidence'],
  additionalProperties: false
} as const;

// Schema genérico para respostas
export const genericResponseSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    intent: {
      type: 'object',
      properties: {
        // Reminder intents
        listReminders: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            message: { type: 'string' },
            description: { type: 'string' }
          },
          additionalProperties: false
        },
        deleteAllReminders: { type: 'boolean' },
        deleteReminders: {
          type: 'object',
          properties: {
            ids: { 
              type: 'array',
              items: { type: 'integer' }
            },
            message: { type: 'string' },
            date: { type: 'string' },
            description: { type: 'string' },
            count: { type: 'integer' }
          },
          additionalProperties: false
        },
        setReminder: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            message: { type: 'string' }
          },
          additionalProperties: true
        }
        // Outros handlers podem adicionar campos adicionais; mantemos additionalProperties habilitado
      },
      additionalProperties: true
    },
    metadata: {
      type: 'object',
      properties: {
        confidence: { type: 'number' },
        suggestedActions: { 
          type: 'array',
          items: { type: 'string' }
        },
        requiresConfirmation: { type: 'boolean' }
      },
      additionalProperties: true
    }
  },
  required: ['reply'],
  additionalProperties: false
} as const;

// Schema específico para respostas de lembretes
export const reminderResponseSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    intent: {
      type: 'object',
      properties: {
        // Reminder intents
        listReminders: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            message: { type: 'string' },
            description: { type: 'string' }
          },
          additionalProperties: false
        },
        deleteAllReminders: { type: 'boolean' },
        deleteReminders: {
          type: 'object',
          properties: {
            ids: { 
              type: 'array',
              items: { type: 'integer' }
            },
            message: { type: 'string' },
            date: { type: 'string' },
            description: { type: 'string' },
            count: { type: 'integer' }
          },
          additionalProperties: false
        },
        setReminder: {
          type: 'object',
          properties: {
            date: { type: 'string' },
            message: { type: 'string' }
          },
          additionalProperties: true
        }
      },
      additionalProperties: true
    },
    metadata: {
      type: 'object',
      properties: {
        confidence: { type: 'number' },
        suggestedActions: { 
          type: 'array',
          items: { type: 'string' }
        },
        requiresConfirmation: { type: 'boolean' },
        deletedReminders: {
          type: 'object',
          properties: {
            count: { type: 'integer' },
            ids: { 
              type: 'array',
              items: { type: 'integer' }
            },
            messages: { 
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['count', 'ids', 'messages'],
          additionalProperties: false
        }
      },
      additionalProperties: true
    }
  },
  required: ['reply'],
  additionalProperties: false
} as const;
