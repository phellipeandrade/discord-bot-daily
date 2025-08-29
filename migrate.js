// Script para gerenciar migrations do Supabase
// Execute com: node migrate.js [migration-name]

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration(migrationName) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não configuradas');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verificar se a migration existe
  const migrationPath = path.join(__dirname, 'migrations', `${migrationName}.sql`);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration ${migrationName} não encontrada`);
    console.log('📁 Migrations disponíveis:');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => file.replace('.sql', ''));
      
      files.forEach(file => console.log(`   - ${file}`));
    }
    return;
  }

  console.log(`🚀 Executando migration: ${migrationName}`);
  console.log(`📁 Arquivo: ${migrationPath}\n`);

  try {
    // Ler o conteúdo da migration
    const migrationContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Conteúdo da migration:');
    console.log('─'.repeat(50));
    console.log(migrationContent);
    console.log('─'.repeat(50));

    // Executar a migration
    console.log('\n🔄 Executando migration no Supabase...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationContent
    });

    if (error) {
      // Se a função RPC não existir, usar query direta
      console.log('ℹ️  Tentando execução direta...');
      
      // Dividir o SQL em comandos individuais
      const commands = migrationContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

      for (const command of commands) {
        if (command.trim()) {
          console.log(`Executando: ${command.substring(0, 50)}...`);
          
          const { error: cmdError } = await supabase
            .from('_dummy') // Tabela que não existe, mas permite execução
            .select('*')
            .limit(1);

          // Como não podemos executar SQL arbitrário via cliente,
          // vamos mostrar instruções manuais
          console.log('⚠️  Execução automática não disponível');
          console.log('📋 Execute manualmente no SQL Editor do Supabase:');
          console.log('\n' + command + ';');
        }
      }
    } else {
      console.log('✅ Migration executada com sucesso!');
    }

  } catch (err) {
    console.error('❌ Erro ao executar migration:', err.message);
  }
}

async function listMigrations() {
  console.log('📁 Migrations disponíveis:\n');
  
  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('Nenhuma migration encontrada');
      return;
    }

    files.forEach(file => {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const firstLine = content.split('\n')[0];
      const description = firstLine.replace('-- Migration:', '').trim();
      
      console.log(`📄 ${file.replace('.sql', '')}`);
      console.log(`   ${description}`);
      console.log('');
    });
  } else {
    console.log('Diretório migrations não encontrado');
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔧 Gerenciador de Migrations do Supabase\n');
    console.log('Uso:');
    console.log('  node migrate.js list                    - Listar migrations');
    console.log('  node migrate.js [migration-name]        - Executar migration');
    console.log('');
    console.log('Exemplo:');
    console.log('  node migrate.js 001_fix_function_security');
    return;
  }

  const command = args[0];

  if (command === 'list') {
    await listMigrations();
  } else {
    await runMigration(command);
  }
}

main();
