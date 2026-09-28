#!/usr/bin/env node
// Ativa o verificador da Fábrica antes de cada commit.
// Roda sozinho no "npm install" (script "prepare"). Fora de um repositório git, não faz nada.
import { execSync } from "node:child_process";

try {
  execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  // Sem git (ex: durante o build na Vercel). Tudo bem.
}
