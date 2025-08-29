-- Script para verificar se as tabelas foram criadas
-- Execute no SQL Editor do Supabase

-- Verificar tabelas existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('reminders', 'users', 'skips', 'config');

-- Verificar estrutura da tabela reminders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'reminders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT indexname, tablename, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('reminders', 'users', 'skips', 'config');
