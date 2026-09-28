// Regras compartilhadas pelos hooks do kit de segurança da Fábrica.
// Cada verificação devolve null (tudo certo) ou uma frase explicando o problema.

"use strict";

const path = require("path");

// ---------- utilidades ----------

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

function block(reason) {
  process.stderr.write(
    "BLOQUEADO PELO KIT DE SEGURANÇA DA FÁBRICA.\n" +
      "Motivo: " + reason + "\n\n" +
      "Não tente contornar este bloqueio com outro comando ou outro arquivo. " +
      "Explique ao aluno, em linguagem simples, o que você queria fazer, por que isso é perigoso " +
      "e qual alternativa segura existe. Se a ação for realmente necessária, mostre o passo para o " +
      "próprio aluno executar manualmente, com um aviso claro de PERIGO e dizendo o que pode ser perdido.\n"
  );
  process.exit(2);
}

// ---------- segredos ----------

const SECRET_NAME = "(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|PASSWD)";

// Variável pública (vai para o navegador) com nome de segredo.
function publicSecretVar(text) {
  const m = text.match(new RegExp("NEXT_PUBLIC_[A-Z0-9_]*" + SECRET_NAME + "[A-Z0-9_]*"));
  return m
    ? `a variável ${m[0]} começa com NEXT_PUBLIC_, então o valor dela vai parar no navegador de qualquer visitante. ` +
        "Segredos nunca podem ter o prefixo NEXT_PUBLIC_."
    : null;
}

function decodeJwtRole(token) {
  try {
    const part = token.split(".")[1];
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(json).role || null;
  } catch {
    return null;
  }
}

// Chave secreta escrita diretamente no código.
function hardcodedSecret(text) {
  const rules = [
    [/sb_secret_[A-Za-z0-9_-]{10,}/, "uma chave secreta do Supabase (sb_secret_...)"],
    [/sk_live_[A-Za-z0-9]{10,}/, "uma chave secreta de pagamentos (sk_live_...)"],
    [/sk-ant-[A-Za-z0-9_-]{10,}/, "uma chave de API da Anthropic"],
    [/sk-(proj-)?[A-Za-z0-9_-]{32,}/, "uma chave de API de IA (sk-...)"],
    [/(ghp_|github_pat_)[A-Za-z0-9_]{20,}/, "um token do GitHub"],
    [/AKIA[0-9A-Z]{16}/, "uma chave de acesso da AWS"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "uma chave privada"],
    [/postgres(ql)?:\/\/[^:\s"'`]+:[^@\s"'`$]{6,}@/, "um endereço do banco de dados com a senha dentro"],
  ];
  for (const [re, what] of rules) {
    if (re.test(text)) return `o conteúdo tem ${what} escrita direto no código.`;
  }
  const jwts = text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || [];
  for (const t of jwts) {
    if (decodeJwtRole(t) === "service_role") {
      return "o conteúdo tem a chave service_role do Supabase escrita no código. Essa chave ignora todas as regras de segurança do banco.";
    }
  }
  return null;
}

const SERVER_ONLY = /(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE|POSTGRES_URL|POSTGRES_PASSWORD|POSTGRES_PRISMA_URL)/;

// Chave de servidor usada em arquivo que roda no navegador.
function secretInClientFile(text) {
  if (!/^\s*["']use client["']/m.test(text)) return null;
  const m = text.match(SERVER_ONLY);
  return m
    ? `este arquivo roda no navegador ("use client") e usa ${m[0]}, que só pode ser usada no servidor.`
    : null;
}

// ---------- banco de dados ----------

function destructiveSql(text) {
  const t = text.toLowerCase();
  const rules = [
    [/\bdrop\s+(table|schema|database|view|materialized\s+view|function|trigger|type|extension|column)\b/, "um DROP, que apaga estrutura do banco e todos os dados dela"],
    [/\btruncate\s+(table\s+)?["\w]/, "um TRUNCATE, que apaga todos os dados de uma tabela"],
    [/\bdelete\s+from\s+[\w."]+\s*(;|$|\)|'|"|`)/m, "um DELETE sem WHERE, que apaga todas as linhas da tabela"],
    [/\bdisable\s+row\s+level\s+security\b/, "o desligamento do RLS, que deixa a tabela aberta para qualquer pessoa"],
    [/\bgrant\s+all\b[^;]*\bto\s+(anon|public)\b/, "um GRANT ALL para visitantes anônimos"],
  ];
  for (const [re, what] of rules) {
    if (re.test(t)) return `o SQL contém ${what}.`;
  }
  return null;
}

// ---------- arquivos ----------

function isEnvFile(p) {
  const b = path.basename(p || "");
  return /^\.env(\..+)?$/.test(b) && !/\.(example|sample|template)$/.test(b);
}

function isFabricaFile(p) {
  const n = (p || "").replace(/\\/g, "/");
  return /(^|\/)scripts\/fabrica-[\w-]+\.mjs$/.test(n) || /(^|\/)\.githooks\//.test(n);
}

module.exports = {
  readStdin,
  block,
  publicSecretVar,
  hardcodedSecret,
  secretInClientFile,
  destructiveSql,
  isEnvFile,
  isFabricaFile,
};
