# Kit de segurança da Fábrica de MVPs com IA

Plugin do Claude Code que protege os alunos do curso dos acidentes mais comuns de iniciante:
apagar o banco sem querer, vazar chaves no GitHub ou no navegador, e deixar o projeto sem as proteções mínimas.

## O que ele faz

**Sempre ativo (em todos os projetos do aluno)**

| Proteção | Como funciona |
| --- | --- |
| Comandos destrutivos | Bloqueia `rm -rf` fora de pastas seguras (`node_modules`, `.next`...), `git push --force`, `git reset --hard`, `git clean`, `supabase db reset`, `prisma migrate reset`, `vercel rm` e SQL com `DROP`, `TRUNCATE`, `DELETE` sem `WHERE` ou desligando RLS |
| Chaves na conversa | Impede a IA de ler `.env`, listar variáveis de ambiente ou imprimir segredos no terminal |
| Chaves no código | Impede salvar arquivos com chave escrita no código (Supabase secret, service_role, Stripe, OpenAI, Anthropic, GitHub, AWS, senha de banco em URL) |
| Chave no navegador | Impede variável `NEXT_PUBLIC_` com nome de segredo e uso de `SUPABASE_SECRET_KEY`/`POSTGRES_*` em arquivos `"use client"` |
| SQL que apaga dados | Impede salvar scripts `.sql` com `DROP`, `TRUNCATE` e `DELETE` sem `WHERE` |
| `.gitignore` | Impede remover a proteção dos arquivos `.env` |
| Regras de segurança | No início de cada sessão, a IA recebe as regras da Fábrica (RLS sempre, admin protegido no servidor, validação no servidor etc.) |

**Comandos para o aluno**

- `/fabrica:proteger`: roda uma vez por projeto, logo depois de criar o Next.js. Completa o `.gitignore`, instala a verificação antes de cada commit (funciona no GitHub Desktop) e antes de cada build (local e na Vercel), proíbe o Claude Code de ler os `.env` do projeto e adiciona headers de segurança.
- `/fabrica:checar`: revisão antes de publicar, com relatório simples (✅ certo, 🔧 corrigido, 👉 você precisa fazer).

## Estrutura

```
fabrica-mvps/
├── .claude-plugin/marketplace.json     catálogo (é isso que o aluno adiciona)
└── plugins/fabrica/
    ├── .claude-plugin/plugin.json      nome e versão do plugin
    ├── regras.md                       regras que a IA recebe em toda sessão (edite à vontade)
    ├── hooks/hooks.json                liga os scripts abaixo
    ├── scripts/
    │   ├── rules.js                    padrões de segredo e SQL perigoso
    │   ├── guard-bash.js               bloqueio de comandos de terminal
    │   ├── guard-files.js              bloqueio de arquivos
    │   └── session-start.js            injeta as regras no início da sessão
    └── skills/
        ├── proteger/                   /fabrica:proteger (instalador + arquivos copiados para o projeto)
        └── checar/                     /fabrica:checar
```

## Publicar (uma vez)

1. No GitHub Desktop, **File > Add local repository** e escolha esta pasta `fabrica-mvps` (ou crie um repositório novo e copie os arquivos para dentro).
2. **Publish repository**. Deixe **público**: assim qualquer aluno instala sem precisar de acesso ao seu GitHub. Não tem nada secreto aqui.
3. Troque `SEU-USUARIO` nos comandos abaixo pelo seu usuário do GitHub.

## Instalação do aluno (entra no módulo F do manual)

No chat do Claude Code:

```
/plugin marketplace add SEU-USUARIO/fabrica-mvps
/plugin install fabrica@fabrica-mvps
```

Ou no terminal: `claude plugin marketplace add SEU-USUARIO/fabrica-mvps` e `claude plugin install fabrica@fabrica-mvps`.

Depois de instalar, abra uma conversa nova do Claude Code para os bloqueios entrarem em ação.

## Atualizar

1. Edite os arquivos e aumente a `version` em `plugins/fabrica/.claude-plugin/plugin.json` (ex: 1.0.0 para 1.1.0).
2. Commit + Push origin.
3. O aluno atualiza com `/plugin marketplace update fabrica-mvps`. Projetos já protegidos recebem o verificador novo rodando `/fabrica:proteger` de novo (é seguro rodar quantas vezes quiser).

## Testar antes de publicar uma mudança

```
claude plugin validate ./fabrica-mvps
claude --plugin-dir ./fabrica-mvps/plugins/fabrica
```

Na sessão aberta, peça algo como "apague a pasta app" ou "rode supabase db reset" e confira se o bloqueio aparece.

## Limites (vale falar na aula)

- Os bloqueios reconhecem padrões de texto. Eles pegam os acidentes comuns, mas não são uma barreira contra alguém tentando contornar de propósito.
- Eles protegem o que **a IA** faz e o que vai para o **GitHub e a Vercel**. O que o aluno faz clicando nos painéis (por exemplo, colar um SQL no SQL Editor do Supabase) não passa por aqui. Para isso, a regra do curso é: SQL com `DROP`, `DELETE` ou `TRUNCATE`, pare e pergunte.
- Precisa do Node.js instalado (já faz parte do módulo F).
