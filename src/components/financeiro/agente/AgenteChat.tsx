"use client";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import Link from "next/link";
import { ChevronLeft, Sparkles, Menu, X } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSession, useSessionToken } from "@/contexts/SessionContext";
import { ChatLista } from "./ChatLista";
import { ChatJanela } from "./ChatJanela";
import { ChatInput } from "./ChatInput";

// Chave LEGADA (global) — vazava o conversaId entre famílias no mesmo aparelho:
// um usuário herdava a conversa de OUTRA família e o backend rejeitava
// ("Conversa não encontrada"). Mantida só pra purgar. A chave atual é por família.
const LEGACY_ULTIMA_KEY = "mcmv_agente_ultima_conversa";
const ultimaKeyDe = (familyId: string) => `mcmv_agente_ultima_conversa_${familyId}`;

interface AgenteChatProps {
  /**
   * 'page' = altura calculada para encaixar dentro do AppShell (-mx-4 -my-6).
   * 'drawer' = ocupa 100% do contêiner pai (drawer faz o sizing).
   */
  layout?: "page" | "drawer";
  /** Renderizado no canto direito do header (ex: botão de fechar do drawer). */
  headerExtra?: React.ReactNode;
  /** Esconde o botão de voltar no header (útil no drawer). */
  esconderVoltar?: boolean;
}

export function AgenteChat({
  layout = "page",
  headerExtra,
  esconderVoltar = false,
}: AgenteChatProps) {
  const token = useSessionToken();
  const { session } = useSession();
  const familyId = session?.familyId;
  const criarConversa = useMutation(api.agente.conversas.criar);
  const processar = useAction(api.agente.core.processar);
  const [conversaId, setConversaId] = useState<Id<"conversasIA"> | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [sidebarMobile, setSidebarMobile] = useState(false);

  // Restaurar última conversa DA FAMÍLIA atual (isolada por familyId).
  useEffect(() => {
    if (typeof window === "undefined" || !familyId) return;
    window.localStorage.removeItem(LEGACY_ULTIMA_KEY); // purga vazamento antigo
    const raw = window.localStorage.getItem(ultimaKeyDe(familyId));
    setConversaId(raw ? (raw as Id<"conversasIA">) : null);
  }, [familyId]);

  useEffect(() => {
    if (typeof window === "undefined" || !familyId) return;
    const key = ultimaKeyDe(familyId);
    if (conversaId) window.localStorage.setItem(key, conversaId);
    else window.localStorage.removeItem(key);
  }, [conversaId, familyId]);

  async function handleNovaConversa() {
    if (!token) return;
    const id = await criarConversa({ sessionToken: token });
    setConversaId(id);
    setSidebarMobile(false);
  }

  async function handleEnviar(
    texto: string,
    anexos: Array<{
      tipo: "imagem" | "pdf" | "audio" | "csv";
      storageId: string;
      nome: string;
      mediaType: string;
    }>
  ) {
    if (!token) return;
    const anexosPayload = anexos.map((a) => ({
      tipo: a.tipo,
      storageId: a.storageId as Id<"_storage">,
      nome: a.nome,
      mediaType: a.mediaType,
    })) as Array<{
      tipo: "imagem" | "pdf" | "audio" | "csv";
      storageId: Id<"_storage">;
      nome: string;
      mediaType: string;
    }>;
    let id = conversaId;
    if (!id) {
      id = await criarConversa({ sessionToken: token });
      setConversaId(id);
    }
    setEnviando(true);
    setErroEnvio(null);
    try {
      await processar({ sessionToken: token, conversaId: id, mensagem: texto, anexos: anexosPayload });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      // conversaId inválido/de outra família (id antigo no localStorage):
      // cria uma conversa nova e tenta de novo (auto-recuperação).
      if (/conversa n[ãa]o encontrada/i.test(msg)) {
        try {
          const novoId = await criarConversa({ sessionToken: token });
          setConversaId(novoId);
          await processar({ sessionToken: token, conversaId: novoId, mensagem: texto, anexos: anexosPayload });
        } catch (e2) {
          setErroEnvio(e2 instanceof Error ? e2.message : "Falha ao processar a mensagem");
        }
      } else {
        setErroEnvio(msg || "Falha ao processar a mensagem");
      }
    } finally {
      setEnviando(false);
    }
  }

  function handleSugestao(texto: string) {
    handleEnviar(texto, []);
  }

  const containerClass =
    layout === "page"
      ? "-mx-4 -my-6 flex h-[calc(100vh-64px)] flex-col md:mx-0 md:my-0 md:h-[calc(100vh-120px)]"
      : "flex h-full flex-col";

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setSidebarMobile(true)}
            className="rounded-full w-9 h-9 flex items-center justify-center text-ink-500 hover:bg-cream-100 md:hidden"
            aria-label="Abrir conversas"
          >
            <Menu size={18} />
          </button>
          {!esconderVoltar && layout === "page" && (
            <Link
              href="/financeiro"
              aria-label="Voltar para Finanças"
              className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-cream-200 text-ink-700 hover:bg-cream-50 hover:border-coral-300 hover:text-coral-600 transition-colors shadow-soft"
            >
              <ChevronLeft size={16} />
            </Link>
          )}
          <div className="flex items-center gap-2 min-w-0 ml-1">
            <Sparkles size={16} className="text-coral-500 shrink-0" />
            <h1 className="font-display text-lg font-bold text-ink-900 truncate">Agente Financeiro</h1>
          </div>
        </div>
        {headerExtra}
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
            className="absolute inset-0 z-40 bg-slate-900/40 md:hidden"
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-100 text-coral-600">
                <Sparkles size={32} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-ink-900">
                  Comece uma conversa com o Agente
                </h2>
                <p className="mt-1 text-sm text-ink-500">
                  Pergunte sobre seus gastos, peça relatórios ou lance despesas e receitas com texto, áudio, imagem ou PDF.
                </p>
              </div>
              <button
                onClick={handleNovaConversa}
                disabled={!token}
                className="rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-50 shadow-pop"
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
