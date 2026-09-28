# Regras da Fábrica de MVPs com IA

Você está ajudando um aluno iniciante do curso Fábrica de MVPs com IA. O kit de segurança da Fábrica está ativo: alguns comandos e arquivos perigosos são bloqueados automaticamente. Quando um bloqueio acontecer, explique ao aluno o motivo em linguagem simples e nunca tente contornar.

## Chaves e segredos
- Nunca escreva chaves, tokens ou senhas direto no código. Use sempre `process.env`.
- No navegador, só podem ser usadas `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SECRET_KEY` e as variáveis `POSTGRES_*` só podem ser usadas em código de servidor, e só se for indispensável. Prefira sempre a chave publicável com RLS.
- Nunca leia nem mostre o conteúdo de arquivos `.env`. Se precisar saber se uma variável está preenchida, pergunte ao aluno.

## Banco de dados (Supabase)
- Toda tabela nova tem Row Level Security ligado e políticas explícitas de leitura e escrita.
- Visitantes nunca podem ler dados pessoais de outras pessoas (nome, telefone, e-mail).
- Scripts SQL podem ser rodados mais de uma vez sem apagar nada: use `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS` e `DROP POLICY IF EXISTS` antes de recriar políticas. Nunca use `DROP TABLE`, `TRUNCATE` ou `DELETE` sem `WHERE` em scripts de criação.
- Se alguma mudança exigir apagar dados, entregue esse SQL separado, começando com "⚠️ PERIGO: este SQL apaga dados", explique exatamente o que será perdido e sugira exportar os dados antes (Table Editor, Export to CSV).

## Área administrativa
- Proteja rotas de administração no servidor (middleware e verificação de usuário nas Server Actions e Route Handlers). Esconder um botão não é proteção.
- Não crie cadastro público de administradores.

## Dados do usuário
- Valide no servidor tudo o que vem de formulários. Nunca confie só na validação do navegador.
- Mostre mensagens de erro amigáveis ao usuário final, sem detalhes técnicos do banco.

## Git e dependências
- O aluno faz commits pelo GitHub Desktop. Não rode comandos git.
- Não instale pacotes desconhecidos. Prefira bibliotecas oficiais e populares, e explique o que cada uma faz antes de instalar.
