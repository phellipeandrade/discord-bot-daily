# 🚀 Configuração do Supabase para o Bot Hermes

## 📋 Visão Geral

Este guia explica como configurar o Supabase como banco de dados remoto para o bot Discord Hermes, substituindo o SQLite local.

## 🔧 Passos de Configuração

### 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Configure:
   - **Name**: `hermes-bot` (ou nome de sua preferência)
   - **Database Password**: Senha forte para o banco
   - **Region**: Escolha a região mais próxima (ex: São Paulo)
6. Clique em "Create new project"

### 2. Configurar o Schema do Banco

1. No dashboard do Supabase, vá para **SQL Editor**
2. Clique em **New Query**
3. Copie e cole o conteúdo do arquivo `supabase-schema.sql`
4. Clique em **Run** para executar o script

### 3. Obter Credenciais

1. No dashboard, vá para **Settings** → **API**
2. Copie as seguintes informações:
   - **Project URL** (ex: `https://xyz.supabase.co`)
   - **anon public** key (chave pública)

### 4. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 5. Testar a Conexão

Execute o bot para testar a conexão:

```bash
npm run build
npm start
```

## 📊 Estrutura das Tabelas

### `reminders`
Armazena os lembretes agendados pelos usuários.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGSERIAL | ID único do lembrete |
| `user_id` | TEXT | ID do usuário do Discord |
| `user_name` | TEXT | Nome do usuário |
| `message` | TEXT | Mensagem do lembrete |
| `scheduled_for` | TIMESTAMPTZ | Data/hora agendada |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `sent` | BOOLEAN | Se foi enviado |
| `sent_at` | TIMESTAMPTZ | Data de envio |

### `users`
Armazena os usuários registrados no bot.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | TEXT | ID do usuário do Discord |
| `name` | TEXT | Nome do usuário |
| `in_remaining` | BOOLEAN | Se está na lista de seleção |
| `last_selected` | BOOLEAN | Se foi o último selecionado |

### `skips`
Armazena usuários que pularam seleção.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `user_id` | TEXT | ID do usuário |
| `skip_until` | DATE | Data até quando pular |

### `config`
Armazena configurações gerais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `key` | TEXT | Chave da configuração |
| `value` | TEXT | Valor da configuração |

## 🔒 Segurança

### Políticas de Acesso (RLS)

Por padrão, o RLS está desabilitado para simplificar a configuração. Para habilitar:

1. Vá para **Authentication** → **Policies**
2. Habilite RLS nas tabelas
3. Configure políticas específicas

### Exemplo de Política Básica:

```sql
-- Permitir apenas leitura para usuários autenticados
CREATE POLICY "Allow read access" ON reminders
FOR SELECT USING (auth.role() = 'authenticated');

-- Permitir inserção para usuários autenticados
CREATE POLICY "Allow insert access" ON reminders
FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 📈 Monitoramento

### Logs
- Acesse **Logs** no dashboard para ver queries e erros
- Configure alertas para falhas de conexão

### Métricas
- **Database** → **Usage** para ver uso de recursos
- **Database** → **Performance** para otimizações

## 🔄 Migração de Dados

Se você já tem dados no SQLite local:

1. Exporte os dados do SQLite:
```bash
sqlite3 src/reminders.db ".dump" > backup.sql
```

2. Converta o formato para PostgreSQL
3. Importe no Supabase via SQL Editor

## 🚨 Troubleshooting

### Erro de Conexão
- Verifique se as variáveis de ambiente estão corretas
- Confirme se o projeto está ativo no Supabase

### Erro de Permissão
- Verifique se a chave anon está correta
- Confirme se as políticas RLS estão configuradas

### Performance
- Monitore os índices criados
- Use o Query Planner para otimizações

## 📝 Benefícios do Supabase

✅ **Escalabilidade**: Suporte a múltiplas instâncias do bot  
✅ **Backup Automático**: Backups diários automáticos  
✅ **Monitoramento**: Logs e métricas detalhadas  
✅ **Segurança**: Políticas de acesso granulares  
✅ **Confiabilidade**: 99.9% de uptime  
✅ **Facilidade**: Interface web para gerenciamento  

## 🔗 Links Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Guia de Migração](https://supabase.com/docs/guides/migrations)
- [Políticas de Segurança](https://supabase.com/docs/guides/auth/row-level-security)
