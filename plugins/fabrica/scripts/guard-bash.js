#!/usr/bin/env node
// Bloqueia comandos de terminal perigosos antes que a IA os execute.
"use strict";

const { readStdin, block, destructiveSql, publicSecretVar } = require("./rules");

// Pastas e arquivos que podem ser apagados sem risco: a própria ferramenta recria.
const SAFE_TO_DELETE = new Set([
  "node_modules", ".next", ".turbo", ".vercel/output", "out", "dist", "coverage",
  "package-lock.json", "tsconfig.tsbuildinfo", "next-env.d.ts",
]);

function normalizeTarget(t) {
  return t.replace(/^["']|["']$/g, "").replace(/^\.[\\/]/, "").replace(/[\\/]+$/, "").replace(/\\/g, "/");
}

// Comando de apagar recursivo apontando para algo fora da lista segura.
function dangerousDelete(cmd) {
  const segments = cmd.split(/&&|\|\||;|\||\n/);
  for (const seg of segments) {
    const s = seg.trim();
    let targets = null;

    let m = s.match(/^(sudo\s+)?rm\s+(.*)$/);
    if (m) {
      const tokens = m[2].split(/\s+/).filter(Boolean);
      const flags = tokens.filter((x) => x.startsWith("-")).join("");
      if (!/r|R|recursive/.test(flags)) continue;
      targets = tokens.filter((x) => !x.startsWith("-"));
    }
    m = !targets && s.match(/^(remove-item|ri|rd|rmdir|del|erase)\s+(.*)$/i);
    if (m) {
      const rest = m[2];
      if (!/(-recurse|\/s\b|-r\b)/i.test(rest)) continue;
      targets = rest.split(/\s+/).filter((x) => x && !/^[-/]/.test(x));
    }
    if (!targets) continue;
    if (targets.length === 0) return "um comando de apagar pastas sem alvo definido.";
    for (const t of targets) {
      const n = normalizeTarget(t);
      if (!SAFE_TO_DELETE.has(n)) {
        return `apagar "${t}" com um comando recursivo. Isso remove a pasta e tudo dentro dela, sem lixeira.`;
      }
    }
  }
  return null;
}

function check(cmd) {
  const c = cmd.toLowerCase();

  const del = dangerousDelete(cmd);
  if (del) return del;

  if (/\b(rm|del|erase|remove-item|ri)\b[^|;&\n]*\.env(?!\.(example|sample|template))\b/i.test(cmd))
    return "apagar um arquivo .env, onde ficam as suas chaves de acesso.";

  // Git: o aluno usa o GitHub Desktop. Comandos que apagam histórico ou trabalho ficam bloqueados.
  const gitRules = [
    [/\bgit\s+push\b[^\n]*(\s--force\b|\s-f\b|--force-with-lease|\s\+\w)/, "um git push forçado, que pode apagar o histórico salvo no GitHub"],
    [/\bgit\s+reset\s+[^\n]*--hard\b/, "um git reset --hard, que joga fora todo o trabalho que ainda não foi salvo em commit"],
    [/\bgit\s+clean\s+-[a-z]*f/, "um git clean, que apaga arquivos que ainda não estão no git"],
    [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/, "descartar todas as mudanças do projeto de uma vez"],
    [/\bgit\s+branch\s+-d\b/i, "apagar uma branch"],
    [/\bgit\s+filter-(branch|repo)\b/, "reescrever o histórico do repositório"],
    [/\bgh\s+repo\s+delete\b/, "apagar um repositório do GitHub"],
  ];
  for (const [re, why] of gitRules) if (re.test(c)) return why + ".";

  // Ferramentas que zeram banco ou apagam projetos.
  const toolRules = [
    [/\bsupabase\s+db\s+reset\b/, "zerar o banco de dados do Supabase"],
    [/\bsupabase\s+projects?\s+delete\b/, "apagar um projeto do Supabase"],
    [/\bprisma\s+migrate\s+reset\b/, "zerar o banco de dados pelo Prisma"],
    [/\bprisma\s+db\s+push\b[^\n]*--(force-reset|accept-data-loss)/, "aplicar mudanças no banco aceitando perda de dados"],
    [/\bdrizzle-kit\s+drop\b/, "apagar migrações do banco"],
    [/\bvercel\s+(rm|remove)\b/, "apagar um projeto ou publicação da Vercel"],
    [/\bvercel\s+project\s+(rm|remove)\b/, "apagar um projeto da Vercel"],
    [/\bvercel\s+env\s+(rm|remove)\b/, "apagar variáveis de ambiente da Vercel"],
  ];
  for (const [re, why] of toolRules) if (re.test(c)) return why + ".";

  const sql = destructiveSql(cmd);
  if (sql) return "executar um comando em que " + sql;

  // Exibir segredos no terminal (eles iriam para a conversa com a IA).
  if (/\b(cat|type|more|less|head|tail|get-content|gc|bat|nl|strings|grep|rg|findstr|select-string|sed|awk)\b[^|;&\n]*\.env(?!\.(example|sample|template))\b/i.test(cmd))
    return "ler um arquivo .env. Ele guarda as suas chaves, e elas não devem aparecer na conversa. Se precisar saber se uma variável está preenchida, pergunte ao aluno.";
  if (/(^|[;&|]\s*)(printenv|env|set|get-childitem\s+env:|gci\s+env:|dir\s+env:)\s*($|[;&|])/im.test(cmd))
    return "listar todas as variáveis de ambiente, o que mostraria chaves secretas na conversa.";
  if (/\$(\{)?(env:)?[A-Z0-9_]*(SECRET|SERVICE_ROLE|PASSWORD|PRIVATE|TOKEN)/i.test(cmd) && /\b(echo|print|write-output|write-host|printf)\b/i.test(cmd))
    return "mostrar o valor de uma variável secreta no terminal.";

  const pub = publicSecretVar(cmd);
  if (pub) return "usar um comando em que " + pub;

  return null;
}

(async () => {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }
  const cmd = (input && input.tool_input && input.tool_input.command) || "";
  if (!cmd) process.exit(0);
  const reason = check(cmd);
  if (reason) block("a IA tentou " + reason);
  process.exit(0);
})();
