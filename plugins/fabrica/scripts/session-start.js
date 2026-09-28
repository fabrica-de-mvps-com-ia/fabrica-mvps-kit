#!/usr/bin/env node
// Coloca as regras da Fábrica no contexto da IA no início de cada sessão.
"use strict";

const fs = require("fs");
const path = require("path");

const { readStdin } = require("./rules");

(async () => {
let cwd = process.cwd();
try {
  const input = JSON.parse(await readStdin());
  if (input && input.cwd) cwd = input.cwd;
} catch {}

const rules = fs.readFileSync(path.join(__dirname, "..", "regras.md"), "utf8");
let out = rules.trim() + "\n";

const hasNext = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    return Boolean((pkg.dependencies && pkg.dependencies.next) || (pkg.devDependencies && pkg.devDependencies.next));
  } catch {
    return false;
  }
})();
const protectedProject = fs.existsSync(path.join(cwd, ".claude", "fabrica.json"));

if (hasNext && !protectedProject) {
  out +=
    "\nATENÇÃO: este projeto Next.js ainda não tem as proteções da Fábrica instaladas. " +
    "Na sua primeira resposta, lembre o aluno de rodar /fabrica:proteger antes de continuar.\n";
}

process.stdout.write(out);
})();
