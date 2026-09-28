#!/usr/bin/env node
// Instala as proteções da Fábrica no projeto atual.
// Uso: node proteger.js   (rodar na pasta do projeto Next.js)
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = process.cwd();
const tpl = path.join(__dirname, "templates");
const done = [];

function fail(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

// 0. Precisa ser um projeto Next.js.
const pkgPath = path.join(root, "package.json");
if (!fs.existsSync(pkgPath)) fail("Não encontrei o package.json. Rode /fabrica:proteger depois de criar o projeto Next.js, dentro da pasta dele.");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
if (!deps.next) fail("Este projeto ainda não é um projeto Next.js. Crie o projeto primeiro e depois rode /fabrica:proteger.");

// 1. .gitignore
const giPath = path.join(root, ".gitignore");
let gi = fs.existsSync(giPath) ? fs.readFileSync(giPath, "utf8") : "";
const giLines = gi.split(/\r?\n/).map((l) => l.trim());
const required = ["node_modules", ".next", ".env*", "!.env.example", ".vercel", "*.pem", ".DS_Store"];
const missing = required.filter((r) => !giLines.includes(r) && !giLines.includes("/" + r));
if (missing.length) {
  gi = gi.replace(/\s*$/, "\n") + "\n# Kit de segurança da Fábrica\n" + missing.join("\n") + "\n";
  fs.writeFileSync(giPath, gi.replace(/^\n+/, ""));
  done.push(".gitignore protegendo " + missing.join(", "));
} else {
  done.push(".gitignore já estava completo");
}

// 2. Verificador e gancho de commit
fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
fs.copyFileSync(path.join(tpl, "fabrica-check.mjs"), path.join(root, "scripts", "fabrica-check.mjs"));
fs.copyFileSync(path.join(tpl, "fabrica-hooks.mjs"), path.join(root, "scripts", "fabrica-hooks.mjs"));
fs.mkdirSync(path.join(root, ".githooks"), { recursive: true });
const hookDest = path.join(root, ".githooks", "pre-commit");
fs.writeFileSync(hookDest, fs.readFileSync(path.join(tpl, "githooks", "pre-commit"), "utf8").replace(/\r\n/g, "\n"));
try { fs.chmodSync(hookDest, 0o755); } catch {}
try {
  execSync("git rev-parse --is-inside-work-tree", { cwd: root, stdio: "ignore" });
  execSync("git config core.hooksPath .githooks", { cwd: root, stdio: "ignore" });
  try { execSync("git update-index --add --chmod=+x .githooks/pre-commit", { cwd: root, stdio: "ignore" }); } catch {}
  done.push("verificação automática antes de cada commit ativada");
} catch {
  done.push("verificação de commit instalada (será ativada quando a pasta for um repositório git)");
}

// 3. package.json: verificar antes do build e reativar o gancho no npm install
pkg.scripts = pkg.scripts || {};
const addScript = (name, cmd) => {
  const cur = pkg.scripts[name];
  if (!cur) pkg.scripts[name] = cmd;
  else if (!cur.includes(cmd)) pkg.scripts[name] = cmd + " && " + cur;
};
addScript("prebuild", "node scripts/fabrica-check.mjs --all");
addScript("prepare", "node scripts/fabrica-hooks.mjs");
addScript("fabrica:check", "node scripts/fabrica-check.mjs --all");
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
done.push("verificação automática antes de cada build (local e na Vercel)");

// 4. Permissões do Claude Code neste projeto
const claudeDir = path.join(root, ".claude");
fs.mkdirSync(claudeDir, { recursive: true });
const setPath = path.join(claudeDir, "settings.json");
let settings = {};
if (fs.existsSync(setPath)) {
  try { settings = JSON.parse(fs.readFileSync(setPath, "utf8")); } catch { fail(".claude/settings.json está com erro de formato. Corrija antes de rodar de novo."); }
}
settings.permissions = settings.permissions || {};
const deny = new Set(settings.permissions.deny || []);
for (const r of [
  "Read(./.env)", "Read(./.env.local)", "Read(./.env.*.local)",
  "Read(./.env.production)", "Read(./.env.development)",
  "Bash(git push --force:*)", "Bash(git reset --hard:*)",
]) deny.add(r);
settings.permissions.deny = [...deny];
fs.writeFileSync(setPath, JSON.stringify(settings, null, 2) + "\n");
done.push("Claude Code proibido de ler seus arquivos .env");

// 5. Marca de projeto protegido
const version = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", ".claude-plugin", "plugin.json"), "utf8")).version; }
  catch { return "?"; }
})();
fs.writeFileSync(path.join(claudeDir, "fabrica.json"), JSON.stringify({ protegido: true, versao_kit: version, data: new Date().toISOString().slice(0, 10) }, null, 2) + "\n");

// 6. Rodar a primeira verificação
let checkOk = true;
try {
  execSync("node scripts/fabrica-check.mjs --all", { cwd: root, stdio: "inherit" });
} catch {
  checkOk = false;
}

console.log("\n✅ Proteções da Fábrica instaladas:");
for (const d of done) console.log("  - " + d);
if (!checkOk) console.log("\n⚠️  A primeira verificação encontrou problemas (veja acima). Eles precisam ser corrigidos.");
