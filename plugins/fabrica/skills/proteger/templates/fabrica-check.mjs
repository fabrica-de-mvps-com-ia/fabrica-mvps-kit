#!/usr/bin/env node
// Verificador de segurança da Fábrica de MVPs com IA.
// Roda sozinho antes de cada commit (--staged) e antes de cada build (--all).
// Não edite este arquivo: ele é instalado pelo comando /fabrica:proteger.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const mode = process.argv.includes("--staged") ? "staged" : "all";
const root = process.cwd();
const problems = [];

const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "out", "dist", "coverage", ".turbo"]);
const CODE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|json|sql|md|mdx|html|css|yml|yaml|toml)$/i;

const isEnv = (f) => /^\.env(\..+)?$/.test(path.basename(f)) && !/\.(example|sample|template)$/.test(f);
const isSelf = (f) => /(^|\/)scripts\/fabrica-[\w-]+\.mjs$/.test(f) || /(^|\/)\.githooks\//.test(f);

function git(cmd) {
  try {
    return execSync("git " + cmd, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return null;
  }
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(path.relative(root, full).replace(/\\/g, "/"));
  }
  return acc;
}

function jwtRole(t) {
  try {
    const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(p, "base64").toString("utf8")).role;
  } catch {
    return null;
  }
}

const SECRET_RULES = [
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "chave secreta do Supabase escrita no código"],
  [/sk_live_[A-Za-z0-9]{10,}/, "chave secreta de pagamentos escrita no código"],
  [/sk-ant-[A-Za-z0-9_-]{10,}/, "chave da Anthropic escrita no código"],
  [/sk-(proj-)?[A-Za-z0-9_-]{32,}/, "chave de API de IA escrita no código"],
  [/(ghp_|github_pat_)[A-Za-z0-9_]{20,}/, "token do GitHub escrito no código"],
  [/AKIA[0-9A-Z]{16}/, "chave da AWS escrita no código"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "chave privada no projeto"],
  [/postgres(ql)?:\/\/[^:\s"'`]+:[^@\s"'`$]{6,}@/, "endereço do banco com a senha dentro"],
];

function scanContent(file, text) {
  const pub = text.match(/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|PASSWD)[A-Z0-9_]*/);
  if (pub) problems.push(`${file}: a variável ${pub[0]} é pública (NEXT_PUBLIC_) mas tem nome de segredo. Ela iria para o navegador.`);

  if (isEnv(file)) return;

  for (const [re, what] of SECRET_RULES) if (re.test(text)) problems.push(`${file}: ${what}.`);
  for (const t of text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) || []) {
    if (jwtRole(t) === "service_role") problems.push(`${file}: chave service_role do Supabase escrita no código.`);
  }
  if (/^\s*["']use client["']/m.test(text)) {
    const m = text.match(/(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE|POSTGRES_URL|POSTGRES_PASSWORD|POSTGRES_PRISMA_URL)/);
    if (m) problems.push(`${file}: arquivo de navegador ("use client") usando ${m[0]}, que só pode ser usada no servidor.`);
  }
}

let files;
if (mode === "staged") {
  const out = git("diff --cached --name-only --diff-filter=ACMR");
  files = out ? out.split("\n").filter(Boolean) : [];
} else {
  files = walk(root);
}

for (const f of files) {
  if (isSelf(f)) continue;
  if (isEnv(f)) {
    if (mode === "staged") {
      problems.push(`${f}: arquivos .env guardam suas chaves e nunca podem ir para o GitHub.`);
      continue;
    }
    const ignored = git(`check-ignore -q "${f}"`) !== null;
    if (!ignored && git("rev-parse --is-inside-work-tree") !== null) {
      problems.push(`${f}: este arquivo .env não está no .gitignore e pode ir para o GitHub.`);
    }
  }
  if (!CODE_EXT.test(f) && !isEnv(f)) continue;
  let text;
  try {
    const full = path.join(root, f);
    if (fs.statSync(full).size > 1_000_000) continue;
    text = fs.readFileSync(full, "utf8");
  } catch {
    continue;
  }
  scanContent(f, text);
}

if (problems.length) {
  console.error("\n🛑 KIT DE SEGURANÇA DA FÁBRICA: encontrei problemas que podem expor suas chaves.\n");
  for (const p of problems) console.error("  - " + p);
  console.error(
    mode === "staged"
      ? "\nO commit foi cancelado para te proteger. Peça ajuda ao Claude Code colando esta mensagem, corrija e tente o commit de novo.\n"
      : "\nA publicação foi cancelada para te proteger. Peça ajuda ao Claude Code colando esta mensagem.\n"
  );
  process.exit(1);
}

if (mode === "all") console.log("✅ Kit de segurança da Fábrica: nenhum problema encontrado.");
