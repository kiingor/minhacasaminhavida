"use client";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { UserPlus, Shield, Mail, UserCircle2, Info, Copy, Check, Pencil, X, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/layout/PageHeader";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ConfigCasalPage() {
  const token = useSessionToken();
  const perfis = useQuery(
    api.pessoas.perfilCasal,
    token ? { sessionToken: token } : "skip"
  );
  const familia = useQuery(api.auth.meuConvite, token ? { token } : "skip");
  const codigo = familia?.conviteCode ?? familia?.familyId ?? "";
  const [copiado, setCopiado] = useState(false);

  // Edição de email de login (self-service + admin edita qualquer membro)
  const alterarEmail = useMutation(api.pessoas.alterarEmail);
  const souAdmin = perfis?.find((p) => p.ehAtual)?.role === "admin";
  const [editId, setEditId] = useState<string | null>(null);
  const [novoEmail, setNovoEmail] = useState("");
  const [erroEmail, setErroEmail] = useState("");
  const [salvandoEmail, setSalvandoEmail] = useState(false);

  // Remoção de conta (admin remove outro membro — nunca a própria nem o último admin)
  const removerConta = useMutation(api.pessoas.removerConta);
  const [removerAlvo, setRemoverAlvo] = useState<
    { userId: Id<"users">; nome: string; email: string } | null
  >(null);
  const [removendo, setRemovendo] = useState(false);
  const [erroRemover, setErroRemover] = useState("");

  function fecharRemocao() {
    if (removendo) return;
    setRemoverAlvo(null);
    setErroRemover("");
  }
  async function confirmarRemocao() {
    if (!removerAlvo) return;
    if (!token) {
      setErroRemover("Sessão expirada. Recarregue a página.");
      return;
    }
    setRemovendo(true);
    setErroRemover("");
    try {
      await removerConta({ sessionToken: token, usuarioId: removerAlvo.userId });
      setRemoverAlvo(null);
    } catch (e) {
      setErroRemover(e instanceof Error ? e.message : "Erro ao remover.");
    } finally {
      setRemovendo(false);
    }
  }

  function abrirEdicaoEmail(userId: string, emailAtual: string) {
    setEditId(userId);
    setNovoEmail(emailAtual);
    setErroEmail("");
  }
  function cancelarEdicaoEmail() {
    setEditId(null);
    setNovoEmail("");
    setErroEmail("");
  }
  async function salvarEmail(userId: Id<"users">) {
    if (!token) return;
    setSalvandoEmail(true);
    setErroEmail("");
    try {
      await alterarEmail({ sessionToken: token, usuarioId: userId, novoEmail: novoEmail.trim() });
      cancelarEdicaoEmail();
    } catch (e) {
      setErroEmail(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSalvandoEmail(false);
    }
  }

  async function copiarCodigo() {
    if (!codigo) return;
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* clipboard pode falhar em contextos não-seguros — ignora */
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-2xl"
    >
      <motion.div variants={item}>
        <PageHeader
          backHref="/configuracoes"
          backLabel="Voltar para Configurações"
          title="Modo Casal"
          subtitle="Perfis de login vinculados ao núcleo familiar."
        />
      </motion.div>

      {/* Lista de perfis */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-white border p-5 shadow-sm space-y-3"
      >
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <UserCircle2 size={20} className="text-primary" />
          Perfis vinculados
        </h2>

        {perfis === undefined ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : perfis.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum perfil encontrado.</p>
        ) : (
          <ul className="space-y-2">
            {perfis.map((p) => (
              <li
                key={p.userId}
                className={`rounded-xl border p-3 flex items-center gap-3 ${
                  p.ehAtual
                    ? "border-primary/40 bg-primary/5"
                    : "border-slate-200 bg-white"
                }`}
              >
                {p.pessoaFotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.pessoaFotoUrl}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{
                      background: p.pessoaCorTema ?? "#94A3B8",
                    }}
                    aria-hidden
                  >
                    {(p.pessoaNome ?? p.name).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800">
                      {p.pessoaNome ?? p.name}
                    </span>
                    {p.ehAtual && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-white font-medium">
                        Você
                      </span>
                    )}
                    {p.role === "admin" ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium inline-flex items-center gap-1">
                        <Shield size={9} /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        Membro
                      </span>
                    )}
                    {p.pessoaTipo === "titular" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                        Titular
                      </span>
                    )}
                    {p.pessoaTipo === "dependente" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">
                        Dependente
                      </span>
                    )}
                    {!p.pessoaId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-medium">
                        Sem perfil de pessoa
                      </span>
                    )}
                  </div>
                  {editId === (p.userId as string) ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="email"
                        value={novoEmail}
                        onChange={(e) => { setNovoEmail(e.target.value); setErroEmail(""); }}
                        className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="email@exemplo.com"
                        autoFocus
                      />
                      {erroEmail && <p className="text-xs text-danger">{erroEmail}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => salvarEmail(p.userId)} disabled={salvandoEmail || !novoEmail.trim()}>
                          <Check size={14} /> {salvandoEmail ? "Salvando..." : "Salvar"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelarEdicaoEmail} disabled={salvandoEmail}>
                          <X size={14} /> Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      <Mail size={11} className="shrink-0" />
                      <span className="truncate">{p.email}</span>
                    </div>
                  )}
                </div>
                {(p.ehAtual || souAdmin) && editId !== (p.userId as string) && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => abrirEdicaoEmail(p.userId as string, p.email)}
                      className="p-2 text-slate-300 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                      aria-label={`Editar email de ${p.pessoaNome ?? p.name}`}
                      title="Corrigir email de login"
                    >
                      <Pencil size={14} />
                    </button>
                    {souAdmin && !p.ehAtual && (
                      <button
                        onClick={() => {
                          setRemoverAlvo({
                            userId: p.userId,
                            nome: p.pessoaNome ?? p.name,
                            email: p.email,
                          });
                          setErroRemover("");
                        }}
                        className="p-2 text-slate-300 hover:text-danger hover:bg-danger/10 rounded transition-colors"
                        aria-label={`Remover conta de ${p.pessoaNome ?? p.name}`}
                        title="Remover conta"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Convidar novo perfil */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-white border p-5 shadow-sm space-y-3"
      >
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <UserPlus size={20} className="text-primary" />
          Convidar parceiro(a)
        </h2>
        <p className="text-sm text-slate-500">
          Compartilhe o <b>código da família</b> abaixo. O parceiro cria o login próprio dele
          e entra no mesmo núcleo familiar.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 font-mono text-lg font-bold tracking-[0.2em] text-slate-800 text-center select-all">
            {familia === undefined ? "…" : codigo || "—"}
          </div>
          <Button variant="outline" onClick={copiarCodigo} disabled={!codigo}>
            {copiado ? <Check size={16} /> : <Copy size={16} />}
            {copiado ? "Copiado" : "Copiar"}
          </Button>
        </div>

        <ol className="text-xs text-slate-500 list-decimal list-inside space-y-0.5 pt-1">
          <li>O parceiro abre a tela de <b>cadastro</b> do app.</li>
          <li>Escolhe <b>&quot;Entrar em família existente&quot;</b>.</li>
          <li>Cola este código e cria o login dele.</li>
        </ol>
      </motion.div>

      {/* Sobre permissoes */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-sm space-y-2"
      >
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Info size={16} className="text-slate-500" />
          Sobre as permissões
        </div>
        <p className="text-slate-600">
          Atualmente, todos os perfis vinculados editam tudo. A configuração granular de
          permissões (somente-leitura, escopo por categoria, etc.) está prevista em
          versões futuras.
        </p>
      </motion.div>

      <ConfirmDialog
        open={!!removerAlvo}
        onClose={fecharRemocao}
        onConfirm={confirmarRemocao}
        closeOnConfirm={false}
        loading={removendo}
        erro={erroRemover}
        title="Remover conta de login"
        confirmLabel="Remover conta"
        loadingLabel="Removendo..."
        description={
          removerAlvo
            ? `Tem certeza que deseja remover a conta de ${removerAlvo.nome}?\n\nLogin: ${removerAlvo.email}\n\nO acesso será revogado e o perfil desta pessoa ficará desativado. Os registros históricos são mantidos.\n\nEsta ação não pode ser desfeita.`
            : ""
        }
      />
    </motion.div>
  );
}
