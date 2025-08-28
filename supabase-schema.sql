-- Schema para o bot Discord Hermes no Supabase
-- Execute este SQL no SQL Editor do Supabase

-- Tabela de lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ
);

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  in_remaining BOOLEAN DEFAULT TRUE,
  last_selected BOOLEAN DEFAULT FALSE
);

-- Tabela de skips (pulos)
CREATE TABLE IF NOT EXISTS skips (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  skip_until DATE NOT NULL
);

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_sent ON reminders(sent);
CREATE INDEX IF NOT EXISTS idx_users_in_remaining ON users(in_remaining);

-- Políticas de segurança (RLS - Row Level Security)
-- Desabilitar RLS para simplificar (você pode habilitar depois se necessário)
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE skips DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;

-- Função para limpar lembretes antigos automaticamente
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS void AS $$
BEGIN
  DELETE FROM reminders 
  WHERE sent = TRUE 
  AND sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE reminders IS 'Lembretes agendados pelos usuários';
COMMENT ON TABLE users IS 'Usuários registrados no bot';
COMMENT ON TABLE skips IS 'Usuários que pularam seleção até uma data';
COMMENT ON TABLE config IS 'Configurações gerais do bot';
