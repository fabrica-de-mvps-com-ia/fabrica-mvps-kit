---
name: proteger
description: Instala as proteções da Fábrica no projeto atual (gitignore, verificação antes de commit e build, bloqueio de leitura do .env e headers de segurança). Use quando o aluno digitar /fabrica:proteger, logo depois de criar o projeto Next.js.
disable-model-invocation: true
---

# Proteger o projeto

Você vai instalar as proteções da Fábrica no projeto do aluno. Fale com ele em linguagem simples e curta.

## Passo 1: rodar o instalador

Na pasta do projeto (a pasta atual), rode o instalador que fica na mesma pasta deste SKILL.md (o "Base directory" desta skill):

```
node "<pasta desta skill>/proteger.js"
```

Se ele disser que o projeto ainda não é Next.js, explique ao aluno que primeiro é preciso criar o projeto (passo 1.1, 2.1 ou 3.1 do manual) e pare aqui.

## Passo 2: headers de segurança

Abra o `next.config` do projeto (`next.config.ts`, `.mjs` ou `.js`) e adicione uma função `headers()` que aplique em todas as rotas (`source: "/(.*)"`):

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Se já existir uma função `headers()`, junte as regras sem apagar as que já estão lá. Não adicione Content-Security-Policy: ela costuma quebrar imagens e scripts em projetos de iniciantes.

## Passo 3: conferir

Rode `npm run fabrica:check`. Depois rode `npm run build` para garantir que nada quebrou. Se algo falhar, corrija e explique o que era.

## Passo 4: explicar ao aluno

Termine com uma mensagem curta, neste formato:

"Pronto! Seu projeto agora está protegido:
- suas chaves (.env) nunca vão para o GitHub,
- o GitHub Desktop vai recusar um commit se encontrar uma chave no código,
- a Vercel vai recusar publicar se encontrar uma chave no lugar errado,
- eu não consigo mais ler seus arquivos de chaves nem rodar comandos que apagam dados.

Agora faça um commit no GitHub Desktop com a mensagem 'Proteções da Fábrica'."

Se o gancho de commit não pôde ser ativado porque a pasta não é um repositório git, avise que o projeto precisa ser criado pelo GitHub Desktop (módulo B do manual) e que depois basta rodar /fabrica:proteger de novo.
