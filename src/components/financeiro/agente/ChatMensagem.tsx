"use client";
import { Bot, User, Wrench } from "lucide-react";
import { Doc } from "../../../../convex/_generated/dataModel";
import { AnexoPersistido } from "./AnexoPreview";
import { DraftLancamentoCard, Draft } from "./DraftLancamentoCard";

type Mensagem = Doc<"mensagensIA">;

export function ChatMensagem({
  msg,
  draftsDaMensagem,
}: {
  msg: Mensagem;
  draftsDaMensagem: Draft[];
}) {
  const isUser = msg.role === "user";

  let toolNomes: string[] = [];
  if (msg.toolUseBlocks) {
    try {
      const arr = JSON.parse(msg.toolUseBlocks) as Array<{ name: string }>;
      toolNomes = Array.from(new Set(arr.map((t) => t.name)));
    } catch {}
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary/10 text-primary" : "bg-violet-100 text-violet-600"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div className={`flex max-w-[85%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {/* Anexos */}
        {msg.anexos && msg.anexos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.anexos.map((a, i) => (
              <AnexoPersistido key={i} anexo={a} />
            ))}
          </div>
        )}

        {/* Texto */}
        {msg.content && (
          <div
            className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
              isUser
                ? "bg-primary text-white"
                : "bg-white text-slate-800 shadow-sm border border-slate-100"
            }`}
          >
            {msg.content}
          </div>
        )}

        {/* Indicador de tools usadas */}
        {!isUser && toolNomes.length > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            <Wrench size={10} />
            <span>
              {toolNomes.length} consulta{toolNomes.length > 1 ? "s" : ""} ao banco
            </span>
          </div>
        )}

        {/* Drafts dessa mensagem */}
        {draftsDaMensagem.length > 0 && (
          <div className="mt-1 flex w-full max-w-md flex-col gap-2">
            {draftsDaMensagem.map((d) => (
              <DraftLancamentoCard key={d._id} draft={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
