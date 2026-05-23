"use client";
import * as React from "react";
import { TermoTooltip } from "./TermoTooltip";
import { TERMOS_FINANCEIROS } from "@/lib/educacao/termos";

interface MarkdownArticleProps {
  conteudo: string;
}

/**
 * Renderizador minimalista de markdown (sem dependencias externas).
 *
 * Suporta:
 * - h2 (## titulo)
 * - h3 (### titulo)
 * - paragrafos
 * - listas nao-ordenadas (- item)
 * - listas ordenadas (1. item)
 * - blockquote (> texto)
 * - **negrito**
 * - *italico*
 * - `codigo inline`
 *
 * Bonus: tokens de texto puro sao escaneados e termos conhecidos da
 * biblioteca TERMOS_FINANCEIROS sao automaticamente envolvidos em
 * <TermoTooltip />.
 */
export function MarkdownArticle({ conteudo }: MarkdownArticleProps) {
  const blocos = React.useMemo(() => parseBlocks(conteudo), [conteudo]);

  return (
    <article className="prose-article">
      {blocos.map((b, i) => (
        <BlocoRenderer key={i} bloco={b} />
      ))}
    </article>
  );
}

// ----- Tipos / Parser -----
type Bloco =
  | { tipo: "h2"; texto: string }
  | { tipo: "h3"; texto: string }
  | { tipo: "p"; texto: string }
  | { tipo: "ul"; itens: string[] }
  | { tipo: "ol"; itens: string[] }
  | { tipo: "blockquote"; texto: string };

function parseBlocks(md: string): Bloco[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocos: Bloco[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Linha em branco — pula
    if (line.trim() === "") {
      i++;
      continue;
    }

    // h2 / h3
    if (line.startsWith("## ")) {
      blocos.push({ tipo: "h2", texto: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocos.push({ tipo: "h3", texto: line.slice(4).trim() });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      blocos.push({ tipo: "blockquote", texto: buf.join(" ") });
      continue;
    }

    // Lista nao-ordenada
    if (line.startsWith("- ")) {
      const itens: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        itens.push(lines[i].slice(2));
        i++;
      }
      blocos.push({ tipo: "ul", itens });
      continue;
    }

    // Lista ordenada (1. item)
    if (/^\d+\.\s/.test(line)) {
      const itens: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        itens.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocos.push({ tipo: "ol", itens });
      continue;
    }

    // Paragrafo — concatena ate proxima linha em branco/bloco
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("##") &&
      !lines[i].startsWith("###") &&
      !lines[i].startsWith("> ") &&
      !lines[i].startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocos.push({ tipo: "p", texto: buf.join(" ") });
  }

  return blocos;
}

function BlocoRenderer({ bloco }: { bloco: Bloco }) {
  switch (bloco.tipo) {
    case "h2":
      return (
        <h2 className="font-display text-xl md:text-2xl font-extrabold text-slate-800 mt-8 mb-3">
          {renderInline(bloco.texto)}
        </h2>
      );
    case "h3":
      return (
        <h3 className="font-display text-lg font-bold text-slate-800 mt-6 mb-2">
          {renderInline(bloco.texto)}
        </h3>
      );
    case "p":
      return (
        <p className="text-slate-700 leading-relaxed my-3">
          {renderInline(bloco.texto)}
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc pl-5 my-3 space-y-1.5 text-slate-700">
          {bloco.itens.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal pl-5 my-3 space-y-1.5 text-slate-700">
          {bloco.itens.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "blockquote":
      return (
        <blockquote className="my-4 border-l-4 border-amber-300 bg-amber-50 px-4 py-2.5 text-slate-700 italic rounded-r-lg">
          {renderInline(bloco.texto)}
        </blockquote>
      );
  }
}

// ----- Inline parsing (markup + auto-tooltip) -----
type InlineToken =
  | { tipo: "texto"; valor: string }
  | { tipo: "negrito"; valor: string }
  | { tipo: "italico"; valor: string }
  | { tipo: "codigo"; valor: string };

/**
 * Tokeniza markdown inline: **negrito**, *italico*, `codigo`.
 * Tokens "texto" sao depois processados por autoLinkTermos.
 */
function tokenizeInline(s: string): InlineToken[] {
  const out: InlineToken[] = [];
  let rest = s;

  // Regex unica que casa qualquer um dos 3 marcadores; captura grupo
  // dependendo do tipo.
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/;

  while (rest.length > 0) {
    const m = re.exec(rest);
    if (!m) {
      out.push({ tipo: "texto", valor: rest });
      break;
    }
    if (m.index > 0) {
      out.push({ tipo: "texto", valor: rest.slice(0, m.index) });
    }
    if (m[1] !== undefined) out.push({ tipo: "negrito", valor: m[1] });
    else if (m[2] !== undefined) out.push({ tipo: "italico", valor: m[2] });
    else if (m[3] !== undefined) out.push({ tipo: "codigo", valor: m[3] });
    rest = rest.slice(m.index + m[0].length);
  }

  return out;
}

/**
 * Constroi a regex que casa qualquer alias de termo conhecido,
 * com word boundary. Cacheada modulo-level.
 */
const TERMOS_REGEX: { aliasParaSlug: Map<string, string>; regex: RegExp } = (() => {
  const aliasParaSlug = new Map<string, string>();
  const partes: string[] = [];

  for (const [slug, termo] of Object.entries(TERMOS_FINANCEIROS)) {
    const aliases = termo.aliases ?? [termo.nome.toLowerCase()];
    for (const alias of aliases) {
      const lower = alias.toLowerCase();
      if (!aliasParaSlug.has(lower)) {
        aliasParaSlug.set(lower, slug);
        // Escape de caracteres especiais regex (so seguranca; aliases sao texto puro)
        partes.push(lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      }
    }
  }

  // Ordena por tamanho decrescente — casa o alias mais longo primeiro
  // ("renda fixa" antes de "renda").
  partes.sort((a, b) => b.length - a.length);

  // \b funciona razoavel com latin1; aceitamos como heuristica.
  const regex = new RegExp(`\\b(${partes.join("|")})\\b`, "gi");
  return { aliasParaSlug, regex };
})();

/**
 * Quebra um texto puro em pedacos: alguns string, outros React Element
 * (TermoTooltip).
 */
function autoLinkTermos(texto: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  TERMOS_REGEX.regex.lastIndex = 0;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = TERMOS_REGEX.regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      out.push(texto.slice(lastIndex, match.index));
    }
    const matched = match[0];
    const slug = TERMOS_REGEX.aliasParaSlug.get(matched.toLowerCase());
    if (slug) {
      out.push(
        <TermoTooltip key={`tt-${key++}`} termo={slug}>
          {matched}
        </TermoTooltip>
      );
    } else {
      out.push(matched);
    }
    lastIndex = match.index + matched.length;
  }

  if (lastIndex < texto.length) {
    out.push(texto.slice(lastIndex));
  }

  return out.length > 0 ? out : [texto];
}

function renderInline(s: string): React.ReactNode {
  const tokens = tokenizeInline(s);
  return tokens.map((tok, i) => {
    if (tok.tipo === "texto") {
      return <React.Fragment key={i}>{autoLinkTermos(tok.valor)}</React.Fragment>;
    }
    if (tok.tipo === "negrito") {
      return (
        <strong key={i} className="font-semibold text-slate-800">
          {autoLinkTermos(tok.valor)}
        </strong>
      );
    }
    if (tok.tipo === "italico") {
      return (
        <em key={i} className="italic">
          {autoLinkTermos(tok.valor)}
        </em>
      );
    }
    return (
      <code
        key={i}
        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[0.85em] font-mono"
      >
        {tok.valor}
      </code>
    );
  });
}
