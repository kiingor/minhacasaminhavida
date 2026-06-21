"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Minus, MessageSquare, ChevronLeft, Plus, Loader2 } from "lucide-react";
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

/**
 * Widget flutuante do Agente IA (estilo Intercom/Crisp).
 * - Não usa backdrop: usuário continua navegando enquanto está aberto.
 * - Pode minimizar (volta pro FAB).
 * - Mantém estado entre rotas (state vive no provider).
 * - View 'chat' (default) ou 'lista' (alternada por toggle).
 */
export function AgenteFAB() {
  const pathname = usePathname();
  const token = useSessionToken();
  const { session } = useSession();
  const familyId = session?.familyId;
  const criarConversa = useMutation(api.agente.conversas.criar);
  const processar = useAction(api.agente.core.processar);

  // ---- UI state ----
  const [aberto, setAberto] = useState(false);
  const [view, setView] = useState<"chat" | "lista">("chat");

  // ---- Conversa state ----
  const [conversaId, setConversaId] = useState<Id<"conversasIA"> | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  // Restaura última conversa DA FAMÍLIA atual (isolada por familyId).
  useEffect(() => {
    if (typeof window === "undefined" || !familyId) return;
    window.localStorage.removeItem(LEGACY_ULTIMA_KEY); // purga vazamento antigo
    const raw = window.localStorage.getItem(ultimaKeyDe(familyId));
    setConversaId(raw ? (raw as Id<"conversasIA">) : null);
  }, [familyId]);

  // Persiste última conversa
  useEffect(() => {
    if (typeof window === "undefined" || !familyId) return;
    const key = ultimaKeyDe(familyId);
    if (conversaId) window.localStorage.setItem(key, conversaId);
    else window.localStorage.removeItem(key);
  }, [conversaId, familyId]);

  // Esconde em rotas onde não faz sentido
  const esconderEm = ["/login", "/financeiro/agente", "/tv"];
  const deveEsconder = esconderEm.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // Esc minimiza (não fecha conversa)
  useEffect(() => {
    if (!aberto) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [aberto]);

  async function handleNovaConversa() {
    if (!token) return;
    const id = await criarConversa({ sessionToken: token });
    setConversaId(id);
    setView("chat");
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
    }));
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

  if (deveEsconder) return null;

  return (
    <>
      {/* FAB — só visível quando widget fechado */}
      <AnimatePresence>
        {!aberto && (
          <motion.button
            key="agente-fab"
            type="button"
            onClick={() => setAberto(true)}
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed z-40 right-4 md:right-6 bottom-24 md:bottom-6 inline-flex items-center gap-2 h-14 px-4 rounded-full bg-coral-500 text-white shadow-[0_10px_28px_rgba(255,107,71,0.35)] hover:bg-coral-600 hover:shadow-[0_14px_32px_rgba(255,107,71,0.45)] transition-all"
            aria-label="Abrir agente financeiro"
          >
            <Sparkles size={20} />
            <span className="font-medium text-sm pr-1 hidden sm:inline">Agente</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Widget flutuante — não bloqueante (sem backdrop) */}
      <AnimatePresence>
        {aberto && (
          <motion.div
            key="agente-widget"
            role="dialog"
            aria-label="Agente Financeiro"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="fixed z-40 right-3 md:right-6 bottom-20 md:bottom-6 w-[calc(100vw-24px)] max-w-[400px] md:w-[400px] h-[calc(100vh-120px)] md:h-[640px] max-h-[640px] flex flex-col bg-white rounded-3xl shadow-[0_20px_60px_rgba(15,15,15,0.25)] border border-cream-200 overflow-hidden"
          >
            {/* Header (coral) */}
            <div className="bg-coral-500 text-white px-4 h-14 flex items-center gap-2 shrink-0">
              {view === "lista" ? (
                <button
                  type="button"
                  onClick={() => setView("chat")}
                  className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/15 transition-colors"
                  aria-label="Voltar ao chat"
                >
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-sm leading-tight truncate">
                  {view === "lista" ? "Conversas" : "Agente Financeiro"}
                </div>
                {view === "chat" && (
                  <div className="text-[10px] text-white/80 leading-tight">
                    {enviando ? "Pensando..." : "Online"}
                  </div>
                )}
              </div>

              {view === "chat" && (
                <button
                  type="button"
                  onClick={() => setView("lista")}
                  className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/15 transition-colors"
                  aria-label="Ver conversas"
                  title="Conversas"
                >
                  <MessageSquare size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/15 transition-colors"
                aria-label="Minimizar"
                title="Minimizar"
              >
                <Minus size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col">
              {view === "lista" ? (
                <ChatLista
                  ativaId={conversaId}
                  onSelecionar={(id) => {
                    setConversaId(id);
                    setView("chat");
                  }}
                  onCriar={handleNovaConversa}
                />
              ) : conversaId ? (
                <>
                  <ChatJanela
                    conversaId={conversaId}
                    enviando={enviando}
                    onSugestao={handleSugestao}
                  />
                  {erroEnvio && (
                    <div className="border-t border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700 shrink-0">
                      {erroEnvio}
                    </div>
                  )}
                  <ChatInput onEnviar={handleEnviar} enviando={enviando} />
                </>
              ) : (
                <EmptyState onCriar={handleNovaConversa} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState({ onCriar }: { onCriar: () => Promise<void> }) {
  const [criando, setCriando] = useState(false);
  async function handleClick() {
    setCriando(true);
    try { await onCriar(); } finally { setCriando(false); }
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-100 text-coral-600">
        <Sparkles size={26} />
      </div>
      <div>
        <h2 className="font-display text-base font-bold text-ink-900">
          Como posso ajudar?
        </h2>
        <p className="mt-1 text-xs text-ink-500 px-2">
          Pergunte sobre gastos, peça relatórios, cadastre despesas com texto, foto ou áudio.
        </p>
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={criando}
        className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-50 shadow-pop"
      >
        {criando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Nova conversa
      </button>
    </div>
  );
}
