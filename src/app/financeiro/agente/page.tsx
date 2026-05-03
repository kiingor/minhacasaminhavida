"use client";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import Link from "next/link";
import { ChevronLeft, Sparkles, Menu, X } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { ChatLista } from "@/components/financeiro/agente/ChatLista";
import { ChatJanela } from "@/components/financeiro/agente/ChatJanela";
import { ChatInput } from "@/components/financeiro/agente/ChatInput";

const ULTIMA_KEY = "mcmv_agente_ultima_conversa";

export default function AgentePage() {
  const token = useSessionToken();
  const criarConversa = useMutation(api.agente.conversas.criar);
  const processar = useAction(api.agente.core.processar);
  const [conversaId, setConversaId] = useState<Id<"conversasIA"> | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [sidebarMobile, setSidebarMobile] = useState(false);

  // Restaurar última conversa
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(ULTIMA_KEY);
    if (raw) setConversaId(raw as Id<"conversasIA">);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (conversaId) window.localStorage.setItem(ULTIMA_KEY, conversaId);
    else window.localStorage.removeItem(ULTIMA_KEY);
  }, [conversaId]);

  async function handleNovaConversa() {
    if (!token) return;
    const id = await criarConversa({ sessionToken: token });
    setConversaId(id);
    setSidebarMobile(false);
  }

  async function handleEnviar(
    texto: string,
    anexos: Array<{
      tipo: "imagem" | "pdf" | "audio";
      storageId: string;
      nome: string;
      mediaType: string;
    }>
  ) {
    if (!token) return;
    let id = conversaId;
    if (!id) {
      id = await criarConversa({ sessionToken: token });
      setConversaId(id);
    }
    setEnviando(true);
    setErroEnvio(null);
    try {
      await processar({
        sessionToken: token,
        conversaId: id,
        mensagem: texto,
        anexos: anexos.map((a) => ({
          tipo: a.tipo,
          storageId: a.storageId as Id<"_storage">,
          nome: a.nome,
          mediaType: a.mediaType,
        })),
      });
    } catch (e: any) {
      setErroEnvio(e?.message ?? "Falha ao processar a mensagem");
    } finally {
      setEnviando(false);
    }
  }

  function handleSugestao(texto: string) {
    handleEnviar(texto, []);
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-64px)] flex-col md:mx-0 md:my-0 md:h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setSidebarMobile(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Abrir conversas"
          >
            <Menu size={18} />
          </button>
          <Link
            href="/financeiro"
            className="hidden items-center gap-1 text-sm text-slate-400 hover:text-slate-700 md:inline-flex"
          >
            <ChevronLeft size={14} /> Finanças
          </Link>
          <span className="hidden text-slate-300 md:inline">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={16} className="text-violet-500 shrink-0" />
            <h1 className="font-display text-lg font-bold truncate">Agente Financeiro</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
          <ChatLista
            ativaId={conversaId}
            onSelecionar={(id) => setConversaId(id)}
            onCriar={handleNovaConversa}
          />
        </aside>

        {/* Sidebar mobile (overlay) */}
        {sidebarMobile && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
            onClick={() => setSidebarMobile(false)}
          >
            <aside
              className="absolute left-0 top-0 h-full w-72 border-r border-slate-200 bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <span className="text-sm font-semibold">Conversas</span>
                <button
                  onClick={() => setSidebarMobile(false)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
              <ChatLista
                ativaId={conversaId}
                onSelecionar={(id) => {
                  setConversaId(id);
                  setSidebarMobile(false);
                }}
                onCriar={handleNovaConversa}
              />
            </aside>
          </div>
        )}

        {/* Janela */}
        <main className="flex flex-1 flex-col min-h-0 min-w-0 bg-white">
          {conversaId ? (
            <>
              <ChatJanela
                conversaId={conversaId}
                enviando={enviando}
                onSugestao={handleSugestao}
              />
              {erroEnvio && (
                <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
                  {erroEnvio}
                </div>
              )}
              <ChatInput onEnviar={handleEnviar} enviando={enviando} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-800">
                  Comece uma conversa com o Agente
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pergunte sobre seus gastos, peça relatórios ou lance despesas e receitas com texto, áudio, imagem ou PDF.
                </p>
              </div>
              <button
                onClick={handleNovaConversa}
                disabled={!token}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Nova conversa
              </button>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}
