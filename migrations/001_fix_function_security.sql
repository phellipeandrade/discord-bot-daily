-- Migration: 001_fix_function_security.sql
-- Data: 2025-08-28
-- Descrição: Corrigir segurança da função cleanup_old_reminders
-- Problema: Function Search Path Mutable

-- Recriar a função com configurações de segurança adequadas
CREATE OR REPLACE FUNCTION public.cleanup_old_reminders()
RETURNS void AS $$
BEGIN
  DELETE FROM public.reminders 
  WHERE sent = TRUE 
  AND sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comentário explicativo
COMMENT ON FUNCTION public.cleanup_old_reminders() IS 'Função para limpar lembretes antigos automaticamente com configurações de segurança';

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
  -- Verificar se a função existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'cleanup_old_reminders' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Function cleanup_old_reminders was not created successfully';
  END IF;
  
  -- Verificar se search_path está definido
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'cleanup_old_reminders' 
    AND proconfig IS NOT NULL
    AND proconfig @> ARRAY['search_path=public']
  ) THEN
    RAISE EXCEPTION 'Function cleanup_old_reminders does not have search_path configured';
  END IF;
  
  -- Verificar se SECURITY DEFINER está configurado
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'cleanup_old_reminders' 
    AND prosecdef = true
  ) THEN
    RAISE EXCEPTION 'Function cleanup_old_reminders is not SECURITY DEFINER';
  END IF;
  
  RAISE NOTICE 'Migration 001_fix_function_security completed successfully';
END $$;
