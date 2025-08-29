# 🔒 Guia de Segurança de Funções no Supabase

## 📋 Visão Geral

O Supabase detecta automaticamente problemas de segurança em funções PostgreSQL e emite avisos para ajudar a manter seu banco de dados seguro.

## 🚨 Problema: "Function Search Path Mutable"

### **Descrição do Problema:**
```
Function public.cleanup_old_reminders has a role mutable search_path
```

### **O que significa:**
- A função não tem o `search_path` definido explicitamente
- Isso pode ser um risco de segurança
- O PostgreSQL pode usar um `search_path` diferente do esperado

### **Por que é um problema:**
- **Injeção de schema**: Ataque onde um schema malicioso é criado
- **Ambiguidade**: Pode acessar tabelas de schemas inesperados
- **Segurança**: Falta de controle sobre qual schema é usado

## ✅ Solução

### **Antes (Inseguro):**
```sql
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS void AS $$
BEGIN
  DELETE FROM reminders 
  WHERE sent = TRUE 
  AND sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### **Depois (Seguro):**
```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_reminders()
RETURNS void AS $$
BEGIN
  DELETE FROM public.reminders 
  WHERE sent = TRUE 
  AND sent_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## 🔧 Como Aplicar a Correção

### **Passo 1: Executar Script de Correção**
1. Acesse o dashboard do Supabase
2. Vá para **SQL Editor**
3. Execute o conteúdo do arquivo `fix-function-security.sql`

### **Passo 2: Verificar Correção**
```sql
-- Verificar se a função foi corrigida
SELECT 
  proname as function_name,
  prosecurity as security_definer,
  proconfig as search_path_config
FROM pg_proc 
WHERE proname = 'cleanup_old_reminders';
```

### **Passo 3: Testar Função**
```sql
-- Testar se a função ainda funciona
SELECT cleanup_old_reminders();
```

## 🛡️ Configurações de Segurança

### **SECURITY DEFINER**
- A função executa com privilégios do criador
- Útil para operações que precisam de permissões elevadas
- Use com cuidado

### **SET search_path = public**
- Define explicitamente o schema a ser usado
- Previne ataques de injeção de schema
- Sempre especifique o schema completo

### **Schema Explícito**
```sql
-- ✅ Bom: Schema explícito
DELETE FROM public.reminders WHERE ...

-- ❌ Ruim: Schema implícito
DELETE FROM reminders WHERE ...
```

## 📊 Melhores Práticas

### **1. Sempre Defina o Schema**
```sql
-- ✅ Correto
SELECT * FROM public.users;
INSERT INTO public.reminders (...) VALUES (...);
UPDATE public.config SET ... WHERE ...;

-- ❌ Evite
SELECT * FROM users;
INSERT INTO reminders (...) VALUES (...);
UPDATE config SET ... WHERE ...;
```

### **2. Use SECURITY DEFINER Quando Necessário**
```sql
-- Para operações que precisam de privilégios elevados
CREATE OR REPLACE FUNCTION admin_operation()
RETURNS void AS $$
BEGIN
  -- Operação administrativa
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### **3. Valide Entradas**
```sql
-- Sempre valide parâmetros
CREATE OR REPLACE FUNCTION safe_function(user_id TEXT)
RETURNS void AS $$
BEGIN
  -- Validar entrada
  IF user_id IS NULL OR user_id = '' THEN
    RAISE EXCEPTION 'user_id cannot be null or empty';
  END IF;
  
  -- Operação segura
  DELETE FROM public.reminders WHERE user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## 🔍 Monitoramento

### **Verificar Funções Problemáticas**
```sql
-- Listar funções sem search_path definido
SELECT 
  p.proname as function_name,
  p.proconfig as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proconfig IS NULL;
```

### **Verificar Configurações de Segurança**
```sql
-- Listar configurações de segurança das funções
SELECT 
  proname as function_name,
  CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type,
  proconfig as search_path_config
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

## 🚨 Troubleshooting

### **Erro: "Function does not exist"**
- Verifique se a função foi criada corretamente
- Confirme o nome e schema da função

### **Erro: "Permission denied"**
- Verifique se o usuário tem permissões adequadas
- Considere usar `SECURITY DEFINER` se necessário

### **Erro: "Schema does not exist"**
- Verifique se o schema `public` existe
- Confirme se as tabelas estão no schema correto

## 📝 Checklist de Segurança

- [ ] Todas as funções têm `search_path` definido
- [ ] Schemas são especificados explicitamente
- [ ] `SECURITY DEFINER` é usado apenas quando necessário
- [ ] Entradas são validadas
- [ ] Funções são testadas após modificações
- [ ] Logs são monitorados regularmente

## 🔗 Links Úteis

- [Documentação PostgreSQL - Funções](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Supabase - Segurança](https://supabase.com/docs/guides/security)
- [PostgreSQL - Search Path](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-SEARCH-PATH)
