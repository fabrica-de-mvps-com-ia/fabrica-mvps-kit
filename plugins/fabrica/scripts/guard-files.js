#!/usr/bin/env node
// Bloqueia arquivos que exporiam chaves, apagariam dados ou tirariam proteções do projeto.
"use strict";

const fs = require("fs");
const path = require("path");
const {
  readStdin, block, publicSecretVar, hardcodedSecret, secretInClientFile,
  destructiveSql, isEnvFile, isFabricaFile,
} = require("./rules");

function newText(input) {
  const ti = input.tool_input || {};
  if (input.tool_name === "Write") return ti.content || "";
  if (input.tool_name === "Edit") return ti.new_string || "";
  if (input.tool_name === "MultiEdit") return (ti.edits || []).map((e) => e.new_string || "").join("\n");
  return "";
}

function oldText(input) {
  const ti = input.tool_input || {};
  if (input.tool_name === "Edit") return ti.old_string || "";
  if (input.tool_name === "MultiEdit") return (ti.edits || []).map((e) => e.old_string || "").join("\n");
  return "";
}

function readExisting(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function check(input) {
  const file = (input.tool_input && input.tool_input.file_path) || "";
  const base = path.basename(file);
  const text = newText(input);
  if (isFabricaFile(file)) return null;

  // 1. Variável pública com nome de segredo (vale até dentro do .env).
  const pub = publicSecretVar(text);
  if (pub) return pub;

  // 2. .gitignore deixando de proteger os arquivos .env.
  if (base === ".gitignore") {
    if (input.tool_name === "Write" && !/\.env/.test(text))
      return "o novo .gitignore não protege os arquivos .env. Sem essa linha, suas chaves iriam para o GitHub no próximo commit.";
    if (input.tool_name !== "Write" && /\.env/.test(oldText(input)) && !/\.env/.test(text))
      return "a edição remove a proteção dos arquivos .env do .gitignore.";
    if (/^\s*!\s*\.env(?!\.(example|sample|template))/m.test(text))
      return "a edição faz o git enviar arquivos .env para o GitHub.";
    return null;
  }

  // Dentro do .env as chaves são esperadas; o resto das regras vale para código.
  if (isEnvFile(file)) return null;

  // 3. Chave secreta escrita no código.
  const hard = hardcodedSecret(text);
  if (hard) return hard + " Use uma variável de ambiente (process.env) e peça ao aluno para colocar o valor no .env.local e na Vercel.";

  // 4. Chave de servidor em arquivo de navegador (olha o arquivo inteiro, não só o trecho editado).
  const whole = input.tool_name === "Write" ? text : readExisting(file) + "\n" + text;
  const client = secretInClientFile(whole);
  if (client) return client + " Mova esse acesso para código de servidor (Server Action, Route Handler ou Server Component).";

  // 5. SQL destrutivo salvo em arquivo.
  const sql = destructiveSql(text);
  if (sql) {
    return sql +
      " Scripts do projeto não podem apagar dados, porque rodar de novo apagaria tudo. Use CREATE TABLE IF NOT EXISTS" +
      " e ALTER TABLE ... ADD COLUMN IF NOT EXISTS. Se for mesmo preciso apagar algo, entregue esse SQL separado na conversa" +
      " com um aviso de PERIGO, em vez de salvar em arquivo.";
  }

  return null;
}

(async () => {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }
  const reason = check(input || {});
  if (reason) block(reason);
  process.exit(0);
})();
