import { Client } from 'discord.js';
import { i18n } from '@/i18n';
import { database, Reminder } from '@/supabase';
import { GoogleGenAI } from '@google/genai';

interface SupabaseError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

class ReminderService {
  private client: Client | null = null;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 30000; // 30 segundos

  setClient(client: Client): void {
    this.client = client;
  }

  start(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Verificar lembretes pendentes a cada 30 segundos
    this.checkInterval = setInterval(() => {
      this.checkPendingReminders().catch(console.error);
    }, this.CHECK_INTERVAL_MS);

    // Verificar imediatamente ao iniciar
    this.checkPendingReminders().catch(console.error);

    console.log('🔔 Reminder service started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🔔 Reminder service stopped');
  }

  async addReminder(
    userId: string,
    userName: string,
    message: string,
    scheduledFor: string
  ): Promise<number> {
    try {
      const reminderId = await database.addReminder(userId, userName, message, scheduledFor);
      console.log(`📝 Reminder ${reminderId} scheduled for ${scheduledFor}`);
      return reminderId;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }

  /**
   * Busca lembretes de um usuário específico
   * 🔒 SEGURANÇA: Sempre filtra por userId, impossível acessar lembretes de outros usuários
   */
  async getRemindersByUser(userId: string): Promise<Reminder[]> {
    try {
      return await database.getRemindersByUser(userId);
    } catch (error) {
      console.error('Error getting user reminders:', error);
      return [];
    }
  }

  /**
   * Busca lembretes de um usuário específico com filtros opcionais usando IA
   */
  async getRemindersByUserWithFilters(
    userId: string,
    filters?: { message?: string; date?: string; description?: string }
  ): Promise<Reminder[]> {
    try {
      const allReminders = await database.getRemindersByUser(userId);
      
      if (!filters || (!filters.message && !filters.date && !filters.description)) {
        return allReminders;
      }

      // Se há filtros, usar IA para encontrar lembretes relevantes
      let filteredReminders: Reminder[] = [];
      
      if (filters.message) {
        filteredReminders = await this.findRemindersBySemanticSimilarity(
          allReminders, 
          filters.message, 
          'message'
        );
      } else if (filters.date) {
        // Buscar por data aproximada
        const targetDate = new Date(filters.date);
        filteredReminders = allReminders.filter(r => {
          const reminderDate = new Date(r.scheduledFor);
          const timeDiff = Math.abs(reminderDate.getTime() - targetDate.getTime());
          return timeDiff < 24 * 60 * 60 * 1000; // Dentro de 24 horas
        });
      } else if (filters.description) {
        filteredReminders = await this.findRemindersBySemanticSimilarity(
          allReminders, 
          filters.description, 
          'description'
        );
      }
      
      return filteredReminders;
    } catch (error) {
      console.error('Error getting user reminders with filters:', error);
      return [];
    }
  }

  /**
   * Deleta um lembrete específico
   * 🔒 SEGURANÇA: userId é OBRIGATÓRIO para garantir que usuários só deletem seus próprios lembretes
   */
  async deleteReminder(reminderId: number, userId: string): Promise<boolean> {
    try {
      // Verificar se o lembrete pertence ao usuário
      const reminders = await database.getRemindersByUser(userId);
      const reminder = reminders.find(r => r.id === reminderId);
      if (!reminder) {
        console.log(`❌ Reminder ${reminderId} not found for user ${userId}`);
        return false;
      }
      
      await database.deleteReminder(reminderId);
      console.log(`🗑️ Reminder ${reminderId} deleted for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      return false;
    }
  }

  /**
   * Encontra e deleta lembretes baseado em critérios usando IA
   * Retorna sempre um array de IDs deletados (pode ser 1 ou múltiplos)
   */
  async findAndDeleteReminders(
    userId: string, 
    criteria: { message?: string; date?: string; description?: string; count?: number }
  ): Promise<{ 
    success: boolean; 
    deletedIds: number[]; 
    deletedMessages: string[];
    count: number;
    message: string; 
  }> {
    try {
      const reminders = await database.getRemindersByUser(userId);
      
      if (reminders.length === 0) {
        return { 
          success: false, 
          deletedIds: [],
          deletedMessages: [],
          count: 0,
          message: 'Você não possui lembretes para deletar' 
        };
      }

      let targetReminders: Reminder[] = [];
      
      if (criteria.message) {
        // Buscar por conteúdo da mensagem usando IA para similaridade semântica
        targetReminders = await this.findRemindersBySemanticSimilarity(
          reminders, 
          criteria.message, 
          'message',
          criteria.count
        );
      } else if (criteria.date) {
        // Buscar por data aproximada
        const targetDate = new Date(criteria.date);
        targetReminders = reminders.filter(r => {
          const reminderDate = new Date(r.scheduledFor);
          const timeDiff = Math.abs(reminderDate.getTime() - targetDate.getTime());
          return timeDiff < 24 * 60 * 60 * 1000; // Dentro de 24 horas
        });
      } else if (criteria.description) {
        // Buscar por descrição usando IA para similaridade semântica
        targetReminders = await this.findRemindersBySemanticSimilarity(
          reminders, 
          criteria.description, 
          'description',
          criteria.count
        );
      }
      
      if (targetReminders.length === 0) {
        return { 
          success: false, 
          deletedIds: [],
          deletedMessages: [],
          count: 0,
          message: 'Nenhum lembrete encontrado com os critérios fornecidos' 
        };
      }

      // Deletar todos os lembretes encontrados
      const deletedIds: number[] = [];
      const deletedMessages: string[] = [];
      let successCount = 0;

      for (const reminder of targetReminders) {
        const deleteSuccess = await this.deleteReminder(reminder.id, userId);
        if (deleteSuccess) {
          deletedIds.push(reminder.id);
          deletedMessages.push(reminder.message);
          successCount++;
        }
      }
      
      if (successCount > 0) {
        const countText = successCount === 1 ? '1 lembrete' : `${successCount} lembretes`;
        return { 
          success: true, 
          deletedIds,
          deletedMessages,
          count: successCount,
          message: `${countText} deletados com sucesso` 
        };
      } else {
        return { 
          success: false, 
          deletedIds: [],
          deletedMessages: [],
          count: 0,
          message: 'Erro ao deletar os lembretes' 
        };
      }
    } catch (error) {
      console.error('Error finding and deleting reminders:', error);
      return { 
        success: false, 
        deletedIds: [],
        deletedMessages: [],
        count: 0,
        message: 'Erro interno ao processar a solicitação' 
      };
    }
  }

  /**
   * Encontra lembretes usando IA para análise semântica
   */
  private async findRemindersBySemanticSimilarity(
    reminders: Reminder[], 
    searchQuery: string, 
    searchType: 'message' | 'description',
    maxCount?: number
  ): Promise<Reminder[]> {
    if (!apiKey) {
      // Fallback para busca simples se não houver API key
      return this.findRemindersBySimpleSearch(reminders, searchQuery, maxCount);
    }

    try {
      const prompt = `
        Você é um assistente especializado em encontrar lembretes baseado em consultas de usuário.
        
        TAREFA: Analise a consulta do usuário e encontre os lembretes mais relevantes da lista fornecida.
        
        CONSULTA DO USUÁRIO: "${searchQuery}"
        TIPO DE BUSCA: ${searchType === 'message' ? 'conteúdo da mensagem' : 'descrição'}
        ${maxCount ? `MÁXIMO DE RESULTADOS: ${maxCount}` : 'RETORNE TODOS OS RELEVANTES'}
        
        LISTA DE LEMBRETES:
        ${reminders.map((r, i) => `${i + 1}. ID: ${r.id} | Mensagem: "${r.message}" | Data: ${r.scheduledFor}`).join('\n')}
        
        INSTRUÇÕES:
        1. Analise a semântica e contexto da consulta do usuário
        2. Considere sinônimos, termos relacionados e intenção
        3. Avalie a relevância de cada lembrete baseado na consulta
        4. Retorne APENAS os IDs dos lembretes mais relevantes, separados por vírgula
        
        EXEMPLOS DE BUSCA:
        - "reunião" pode encontrar "daily meeting", "standup", "call with client"
        - "código" pode encontrar "review PR", "deploy", "test feature"
        - "email" pode encontrar "send report", "contact support", "follow up"
        
        Retorne APENAS uma lista de números (IDs dos lembretes mais relevantes) separados por vírgula, ou "null" se nenhum for relevante.
        Exemplo: "1,3,5" ou "2,4" ou "null"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: prompt,
        config: {
          temperature: 0.1, // Baixa temperatura para respostas mais consistentes
          maxOutputTokens: 20
        }
      });

      const aiResponse = response.text?.trim();
      
      if (!aiResponse || aiResponse === 'null') {
        return [];
      }

      // Tentar extrair os IDs dos lembretes da resposta da IA
      const reminderIds = aiResponse.split(',').map(id => parseInt(id.trim()));
      const validIds = reminderIds.filter(id => !isNaN(id));
      
      if (validIds.length === 0) {
        // Se a IA não retornou IDs válidos, usar fallback
        return this.findRemindersBySimpleSearch(reminders, searchQuery, maxCount);
      }

      // Encontrar os lembretes pelos IDs retornados pela IA
      const foundReminders = reminders.filter(r => validIds.includes(r.id));
      
      // Limitar o número de resultados se especificado
      if (maxCount && foundReminders.length > maxCount) {
        return foundReminders.slice(0, maxCount);
      }
      
      return foundReminders;

    } catch (error) {
      console.error('Error using AI for reminder search:', error);
      // Fallback para busca simples em caso de erro na IA
      return this.findRemindersBySimpleSearch(reminders, searchQuery, maxCount);
    }
  }

  /**
   * Método de fallback para busca simples de lembretes
   */
  private findRemindersBySimpleSearch(
    reminders: Reminder[], 
    searchQuery: string,
    maxCount?: number
  ): Reminder[] {
    const query = searchQuery.toLowerCase();
    
    // Buscar por correspondência exata primeiro
    let matches = reminders.filter(r => 
      r.message.toLowerCase().includes(query)
    );
    
    if (matches.length === 0) {
      // Buscar por palavras-chave com pontuação
      const STOPWORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'o', 'a', 'os', 'as', 'um', 'uma', 'e']);
      const tokens = query
        .split(/[^\p{L}\p{N}]+/u)
        .filter(t => t && !STOPWORDS.has(t) && t.length >= 3);

      if (tokens.length > 0) {
        const scoredReminders = reminders.map(r => {
          const msg = r.message.toLowerCase();
          let score = 0;
          for (const t of tokens) {
            if (msg.includes(t)) score += 1;
          }
          return { reminder: r, score };
        });

        // Filtrar apenas lembretes com score > 0 e ordenar por relevância
        matches = scoredReminders
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map(item => item.reminder);
      }
    }
    
    // Limitar o número de resultados se especificado
    if (maxCount && matches.length > maxCount) {
      return matches.slice(0, maxCount);
    }
    
    return matches;
  }

  /**
   * Deleta todos os lembretes de um usuário específico
   * 🔒 SEGURANÇA: Sempre deleta apenas lembretes do userId especificado
   */
  async deleteAllRemindersByUser(userId: string): Promise<number> {
    try {
      const deletedCount = await database.deleteAllRemindersByUser(userId);
      console.log(`🗑️ Deleted ${deletedCount} reminders for user ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error('Error deleting all reminders for user:', error);
      return 0;
    }
  }

  async getStats(): Promise<{ total: number; pending: number; sent: number }> {
    try {
      return await database.getReminderStats();
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return { total: 0, pending: 0, sent: 0 };
    }
  }

  private async checkPendingReminders(): Promise<void> {
    if (!this.client) {
      console.warn('Client not set for reminder service');
      return;
    }

    try {
      const pendingReminders = await this.getPendingRemindersWithRetry();
      
      if (!pendingReminders || !Array.isArray(pendingReminders)) {
        console.warn('No pending reminders or invalid response from database');
        return;
      }
      
      for (const reminder of pendingReminders) {
        await this.sendReminder(reminder);
      }
    } catch (error) {
      const supabaseError = error as SupabaseError;
      console.error('Error checking pending reminders:', {
        message: error instanceof Error ? error.message : String(error),
        details: supabaseError.details,
        hint: supabaseError.hint,
        code: supabaseError.code
      });
    }
  }

  private async getPendingRemindersWithRetry(maxRetries: number = 3): Promise<Reminder[]> {
    let lastError: Error | unknown;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting to fetch pending reminders (attempt ${attempt}/${maxRetries})`);
        const reminders = await database.getPendingReminders();
        console.log(`✅ Successfully fetched ${reminders.length} pending reminders`);
        return reminders;
      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const supabaseError = error as SupabaseError;
        console.warn(`⚠️ Attempt ${attempt} failed:`, {
          message: errorMessage,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code
        });
        
        // If it's a network error (fetch failed), wait before retrying
        if (errorMessage?.includes('fetch failed') && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else if (attempt < maxRetries) {
          // For other errors, shorter delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    console.error(`❌ All ${maxRetries} attempts failed to fetch pending reminders`);
    throw lastError;
  }

  private async sendReminder(reminder: Reminder): Promise<void> {
    if (!this.client) return;

    try {
      const user = await this.client.users.fetch(reminder.userId);
      if (user) {
        await user.send(i18n.t('reminder.notify', { text: reminder.message }));
        await database.markReminderAsSent(reminder.id, reminder.userId);
        console.log(`✅ Reminder ${reminder.id} sent to ${reminder.userName}`);
      } else {
        console.warn(`User ${reminder.userId} not found for reminder ${reminder.id}`);
        // Marcar como enviado mesmo que o usuário não seja encontrado para evitar loops
        await database.markReminderAsSent(reminder.id, reminder.userId);
      }
    } catch (error) {
      console.error(`Error sending reminder ${reminder.id}:`, error);
      // Em caso de erro, não marcar como enviado para tentar novamente
    }
  }

  async cleanupOldReminders(daysOld: number = 30): Promise<void> {
    try {
      await database.deleteOldReminders(daysOld);
      console.log(`🧹 Cleaned up reminders older than ${daysOld} days`);
    } catch (error) {
      console.error('Error cleaning up old reminders:', error);
    }
  }

  formatReminderList(reminders: Reminder[]): string {
    if (reminders.length === 0) {
      return i18n.t('reminder.list.noReminders');
    }

    const now = new Date();
    
    // Deduplicar lembretes baseado na mensagem e data/hora
    const uniqueReminders = reminders.reduce((acc, reminder) => {
      const key = `${reminder.message}-${reminder.scheduledFor}`;
      if (!acc.has(key)) {
        acc.set(key, reminder);
      }
      return acc;
    }, new Map<string, Reminder>());

    const uniqueRemindersList = Array.from(uniqueReminders.values());
    
    // Ordenar lembretes por data (mais próximos primeiro)
    uniqueRemindersList.sort((a, b) => {
      const dateA = new Date(a.scheduledFor);
      const dateB = new Date(b.scheduledFor);
      return dateA.getTime() - dateB.getTime();
    });
    
    const formattedReminders = uniqueRemindersList.map((reminder, index) => {
      const scheduledDate = new Date(reminder.scheduledFor);
      
      // Formatar data no padrão brasileiro dd/mm/aaaa
      const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const dateStr = `${formattedDate} às ${formattedTime}`;
      
      // Calcular tempo relativo (sempre positivo agora, pois filtramos lembretes passados)
      const timeDiff = scheduledDate.getTime() - now.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursDiff = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesDiff = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      let relativeTime = '';
      if (daysDiff > 0) {
        relativeTime = ` (em ${daysDiff} dia${daysDiff > 1 ? 's' : ''})`;
      } else if (hoursDiff > 0) {
        relativeTime = ` (em ${hoursDiff} hora${hoursDiff > 1 ? 's' : ''})`;
      } else if (minutesDiff > 0) {
        relativeTime = ` (em ${minutesDiff} minuto${minutesDiff > 1 ? 's' : ''})`;
      } else {
        relativeTime = ' (agora)';
      }

      return `**${index + 1}.** ⏳ **${dateStr}**${relativeTime}\n└ 📝 ${reminder.message}\n└ 🆔 ID: ${reminder.id}`;
    });
    
    return formattedReminders.join('\n\n');
  }
}

// Singleton instance
export const reminderService = new ReminderService();
