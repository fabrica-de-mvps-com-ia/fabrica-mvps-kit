---
name: checar
description: Revisão de segurança e qualidade do projeto antes de publicar, com um relatório simples para o aluno. Use quando o aluno digitar /fabrica:checar ou pedir para revisar o projeto antes de publicar.
disable-model-invocation: true
---

# Checar o projeto antes de publicar

Você vai revisar o projeto do aluno antes de ele publicar. Ele é iniciante: o relatório final precisa ser curto e sem jargão. Corrija o que conseguir e explique o que só ele pode fazer.

## 1. Proteções instaladas
- Se não existir `.claude/fabrica.json` ou `scripts/fabrica-check.mjs`, pare e peça ao aluno para rodar `/fabrica:proteger` primeiro.
- Rode `npm run fabrica:check`. Corrija qualquer problema encontrado.

## 2. Build
- Rode `npm run build` e corrija erros. Avisos importantes também.

## 3. Chaves e segredos (leia o código, não os arquivos .env)
- Nenhuma chave escrita no código. Tudo vem de `process.env`.
- Arquivos com `"use client"` usam só variáveis `NEXT_PUBLIC_`.
- `SUPABASE_SECRET_KEY` só aparece em código de servidor, e só se for indispensável.

## 4. Banco de dados (se o projeto usa Supabase)
- Todo SQL do projeto (arquivos `.sql` e o que foi entregue na conversa) liga RLS em todas as tabelas e cria políticas.
- Visitantes não conseguem ler dados pessoais de outros clientes.
- Nenhum script apaga dados (DROP, TRUNCATE, DELETE sem WHERE).
- Peça ao aluno para conferir no painel do Supabase (Vercel, aba Storage, Open in Supabase): em Advisors, na parte de segurança, não pode haver alerta de tabela sem RLS.

## 5. Área administrativa (se existir)
- Rotas de admin protegidas no servidor (middleware) e cada ação de admin confere se há usuário logado.
- Não existe página pública de cadastro de administrador.

## 6. Formulários
- Dados validados no servidor, não só no navegador.
- Mensagens de erro amigáveis, sem detalhes técnicos.

## 7. Celular
- Telas principais sem rolagem horizontal em 375px de largura.

## Relatório final

Responda neste formato, com no máximo uma linha por item:

"Revisão da Fábrica
✅ ... (o que está certo)
🔧 ... (o que eu corrigi)
👉 ... (o que você precisa fazer, com o passo a passo)

Pronto para publicar: SIM / AINDA NÃO"

Se corrigiu algo, termine lembrando o aluno de fazer um commit no GitHub Desktop.
