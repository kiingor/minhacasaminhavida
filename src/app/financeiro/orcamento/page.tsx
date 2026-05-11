"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronDown, ChevronRight, Copy, Gauge, Plus, CornerDownRight } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { MonthSelector } from "@/components/financeiro/MonthSelector";
import { OrcamentoBarra } from "@/components/financeiro/OrcamentoBarra";
import { OrcamentoLimiteEditor } from "@/components/financeiro/OrcamentoLimiteEditor";
import { CategoriaSelect } from "@/components/financeiro/CategoriaSelect";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { formatBRL, parseBRL } from "@/lib/formatters";
import { currentMonth, shiftMonth, monthLabelLong } from "@/lib/monthUtils";

type Status = "ok" | "atencao" | "estourada" | "sem_limite";

const STATUS_LABEL: Record<Status, string> = {
  ok: "OK",
  atencao: "Atenção",
  estourada: "Estourada",
  sem_limite: "Sem limite",
};

const STATUS_BADGE: Record<Status, string> = {
  ok: "bg-success/15 text-success",
  atencao: "bg-warning/15 text-amber-700",
  estourada: "bg-danger/15 text-danger",
  sem_limite: "bg-slate-100 text-slate-500",
};

export default function OrcamentoPage() {
  const token = useSessionToken();
  const [mes, setMes] = useState(currentMonth());
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [showAdicionar, setShowAdicionar] = useState(false);
  const [confirmCopiar, setConfirmCopiar] = useState(false);

  const itens = useQuery(
    api.financeiro.orcamento.listMes,
    token ? { sessionToken: token, mes } : "skip"
  );
  const itensMesAnterior = useQuery(
    api.financeiro.orcamento.listMes,
    token ? { sessionToken: token, mes: shiftMonth(mes, -1) } : "skip"
  );

  const setLimite = useMutation(api.financeiro.orcamento.setLimite);
  const copiarMes = useMutation(api.financeiro.orcamento.copiarMesAnterior);

  // Stats agregadas
  const stats = useMemo(() => {
    if (!itens) return null;
    const ok = itens.filter((i) => i.status === "ok").length;
    const atencao = itens.filter((i) => i.status === "atencao").length;
    const estouradas = itens.filter((i) => i.status === "estourada").length;
    const semLimite = itens.filter((i) => i.status === "sem_limite").length;
    const totalLimite = itens.reduce((s, i) => s + i.limite, 0);
    const totalRealizado = itens.reduce((s, i) => s + i.realizado, 0);
    const percentualGeral = totalLimite > 0 ? Math.round((totalRealizado / totalLimite) * 100) : 0;
    const totalComLimite = ok + atencao + estouradas;
    const temLimites = totalComLimite > 0;
    return {
      ok,
      atencao,
      estouradas,
      semLimite,
      totalLimite,
      totalRealizado,
      percentualGeral,
      temLimites,
    };
  }, [itens]);

  const mesAnteriorStr = shiftMonth(mes, -1);
  const mesAnteriorTemLimites = useMemo(() => {
    if (!itensMesAnterior) return false;
    return itensMesAnterior.some((i) => i.limite > 0);
  }, [itensMesAnterior]);
  const mesAtualSemLimites = stats !== null && !stats.temLimites;

  function toggleExpand(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSetLimite(categoriaId: Id<"categorias">, valorLimite: number) {
    if (!token) return;
    await setLimite({ sessionToken: token, categoriaId, mes, valorLimite });
  }

  async function executarCopia(sobrescrever: boolean) {
    if (!token) return;
    try {
      await copiarMes({
        sessionToken: token,
        mesOrigem: mesAnteriorStr,
        mesDestino: mes,
        sobrescrever,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao copiar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/financeiro"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1"
          >
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Gauge size={28} className="text-amber-500" /> Orçamento
          </h1>
          <p className="text-slate-500">
            Defina limites por categoria e acompanhe o realizado com semáforo
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <MonthSelector mes={mes} onChange={setMes} />
          <Button
            variant="outline"
            disabled={!mesAnteriorTemLimites}
            onClick={() => {
              if (mesAtualSemLimites) {
                executarCopia(false);
              } else {
                setConfirmCopiar(true);
              }
            }}
            title={
              mesAnteriorTemLimites
                ? `Copiar limites de ${monthLabelLong(mesAnteriorStr)}`
                : "Mês anterior não tem limites"
            }
          >
            <Copy size={14} /> Copiar mês anterior
          </Button>
        </div>
      </div>

      {/* Resumo */}
      {itens === undefined || stats === null ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : !stats.temLimites ? (
        <EmptyState
          mesAnteriorTemLimites={mesAnteriorTemLimites}
          mesAnteriorLabel={monthLabelLong(mesAnteriorStr)}
          onCopiar={() => executarCopia(false)}
          onDefinir={() => setShowAdicionar(true)}
        />
      ) : (
        <ResumoCard stats={stats} />
      )}

      {/* Lista */}
      {itens === undefined ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl text-slate-400">
          <p className="font-medium">Nenhum gasto ou limite neste mês.</p>
          <p className="text-sm mt-1">
            Defina o primeiro limite para começar a acompanhar.
          </p>
          <Button onClick={() => setShowAdicionar(true)} className="mt-4">
            <Plus size={14} /> Definir limite
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {itens.map((it) => {
              const expanded = expandidos.has(it.categoriaId as string);
              const Icon = iconeDaCategoria(it.icone);
              return (
                <motion.li
                  key={it.categoriaId}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl bg-white border p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {it.subcategorias.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(it.categoriaId as string)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-50 shrink-0"
                        aria-label={expanded ? "Recolher subcategorias" : "Expandir subcategorias"}
                        aria-expanded={expanded}
                      >
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    ) : (
                      <span className="w-6 shrink-0" aria-hidden />
                    )}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${it.cor}20`, color: it.cor }}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-base truncate">{it.nome}</h3>
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${STATUS_BADGE[it.status]}`}
                        >
                          {STATUS_LABEL[it.status]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra + valores */}
                  <div className="mt-3 space-y-2">
                    <OrcamentoBarra percentual={it.percentual} status={it.status} />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="font-mono text-slate-600">
                        <span className="font-semibold text-slate-800">{formatBRL(it.realizado)}</span>
                        {" "}/{" "}
                        {it.limite > 0 ? (
                          <OrcamentoLimiteEditor
                            valorLimite={it.limite}
                            size="sm"
                            onSave={(novo) => handleSetLimite(it.categoriaId, novo)}
                            ariaLabel={`Editar limite de ${it.nome}`}
                          />
                        ) : (
                          <OrcamentoLimiteEditor
                            valorLimite={0}
                            size="sm"
                            semLimite
                            onSave={(novo) => handleSetLimite(it.categoriaId, novo)}
                            ariaLabel={`Definir limite de ${it.nome}`}
                          />
                        )}
                      </div>
                      {it.limite > 0 && (
                        <span
                          className={`font-semibold ${
                            it.status === "estourada"
                              ? "text-danger"
                              : it.status === "atencao"
                              ? "text-amber-700"
                              : "text-success"
                          }`}
                        >
                          {it.percentual}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subcategorias */}
                  <AnimatePresence initial={false}>
                    {expanded && it.subcategorias.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-3 overflow-hidden border-t pt-3"
                      >
                        {it.subcategorias.map((sub) => {
                          const SubIcon = iconeDaCategoria(sub.icone);
                          return (
                            <li
                              key={sub.categoriaId}
                              className="pl-8 flex flex-col gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <CornerDownRight size={14} className="text-slate-300 shrink-0" />
                                <div
                                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                                  style={{ background: `${sub.cor}20`, color: sub.cor }}
                                >
                                  <SubIcon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm truncate">{sub.nome}</span>
                                    <span
                                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${STATUS_BADGE[sub.status]}`}
                                    >
                                      {STATUS_LABEL[sub.status]}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="pl-8 space-y-1.5">
                                <OrcamentoBarra
                                  percentual={sub.percentual}
                                  status={sub.status}
                                  altura="sm"
                                />
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="font-mono text-slate-600">
                                    <span className="font-semibold text-slate-800">
                                      {formatBRL(sub.realizado)}
                                    </span>
                                    {" "}/{" "}
                                    <OrcamentoLimiteEditor
                                      valorLimite={sub.limite}
                                      size="sm"
                                      semLimite={sub.limite === 0}
                                      onSave={(novo) => handleSetLimite(sub.categoriaId, novo)}
                                      ariaLabel={`Editar limite de ${sub.nome}`}
                                    />
                                  </div>
                                  {sub.limite > 0 && (
                                    <span
                                      className={`font-semibold ${
                                        sub.status === "estourada"
                                          ? "text-danger"
                                          : sub.status === "atencao"
                                          ? "text-amber-700"
                                          : "text-success"
                                      }`}
                                    >
                                      {sub.percentual}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {/* Botao adicionar limite (categoria que ainda nao apareceu na lista) */}
      {itens && itens.length > 0 && (
        <div className="pt-2">
          <Button variant="outline" onClick={() => setShowAdicionar(true)}>
            <Plus size={14} /> Definir limite em outra categoria
          </Button>
        </div>
      )}

      {/* Dialog adicionar limite */}
      {showAdicionar && (
        <AdicionarLimiteDialog
          mes={mes}
          onClose={() => setShowAdicionar(false)}
          onSave={async (catId, valor) => {
            await handleSetLimite(catId, valor);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmCopiar}
        onClose={() => setConfirmCopiar(false)}
        onConfirm={() => executarCopia(true)}
        title="Sobrescrever limites?"
        description={`Já existem limites em ${monthLabelLong(mes)}. Copiar de ${monthLabelLong(mesAnteriorStr)} sobrescreverá os limites já definidos. Continuar?`}
        confirmLabel="Sobrescrever"
      />
    </div>
  );
}

// ==================== Subcomponentes ====================

interface ResumoStats {
  ok: number;
  atencao: number;
  estouradas: number;
  semLimite: number;
  totalLimite: number;
  totalRealizado: number;
  percentualGeral: number;
}

function ResumoCard({ stats }: { stats: ResumoStats }) {
  const totalCategoriasComLimite = stats.ok + stats.atencao + stats.estouradas;
  return (
    <section className="rounded-2xl bg-white border p-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-display font-bold text-lg">Resumo do mês</h2>
          <p className="text-xs text-slate-500">
            <span className="font-mono font-semibold text-slate-800">{formatBRL(stats.totalRealizado)}</span> de{" "}
            <span className="font-mono font-semibold text-slate-800">{formatBRL(stats.totalLimite)}</span> ·{" "}
            <span
              className={`font-semibold ${
                stats.percentualGeral >= 100
                  ? "text-danger"
                  : stats.percentualGeral >= 80
                  ? "text-amber-700"
                  : "text-success"
              }`}
            >
              {stats.percentualGeral}%
            </span>
          </p>
        </div>
      </div>

      {/* Barra de proporcao por status */}
      {totalCategoriasComLimite > 0 && (
        <div
          className="h-3 rounded-full overflow-hidden flex bg-slate-100 mb-3"
          role="img"
          aria-label={`${stats.ok} categorias OK, ${stats.atencao} em atenção e ${stats.estouradas} estouradas`}
        >
          {stats.ok > 0 && (
            <div
              className="bg-success h-full transition-all"
              style={{ width: `${(stats.ok / totalCategoriasComLimite) * 100}%` }}
            />
          )}
          {stats.atencao > 0 && (
            <div
              className="bg-warning h-full transition-all"
              style={{ width: `${(stats.atencao / totalCategoriasComLimite) * 100}%` }}
            />
          )}
          {stats.estouradas > 0 && (
            <div
              className="bg-danger h-full transition-all"
              style={{ width: `${(stats.estouradas / totalCategoriasComLimite) * 100}%` }}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" aria-hidden />
          <strong>{stats.ok}</strong> OK
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" aria-hidden />
          <strong>{stats.atencao}</strong> atenção
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" aria-hidden />
          <strong>{stats.estouradas}</strong> estouradas
        </span>
      </div>
    </section>
  );
}

function EmptyState({
  mesAnteriorTemLimites,
  mesAnteriorLabel,
  onCopiar,
  onDefinir,
}: {
  mesAnteriorTemLimites: boolean;
  mesAnteriorLabel: string;
  onCopiar: () => void;
  onDefinir: () => void;
}) {
  return (
    <section className="rounded-2xl bg-white border p-6 text-center shadow-sm">
      <Gauge size={36} className="mx-auto mb-3 text-slate-300" />
      <h2 className="font-display font-bold text-lg">Nenhum limite definido</h2>
      <p className="text-sm text-slate-500 mt-1">
        Defina o primeiro limite ou copie do mês anterior para começar a acompanhar com semáforo.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        <Button onClick={onDefinir}>
          <Plus size={14} /> Definir primeiro limite
        </Button>
        {mesAnteriorTemLimites && (
          <Button variant="outline" onClick={onCopiar}>
            <Copy size={14} /> Copiar de {mesAnteriorLabel}
          </Button>
        )}
      </div>
    </section>
  );
}

function AdicionarLimiteDialog({
  mes,
  onClose,
  onSave,
}: {
  mes: string;
  onClose: () => void;
  onSave: (categoriaId: Id<"categorias">, valor: number) => Promise<void>;
}) {
  const token = useSessionToken();
  const categorias = useQuery(
    api.financeiro.categorias.list,
    token ? { sessionToken: token, tipo: "despesa" } : "skip"
  );
  const [categoriaId, setCategoriaId] = useState<Id<"categorias"> | "">("");
  const [valorTexto, setValorTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }
    const valor = parseBRL(valorTexto);
    if (valor <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    setSalvando(true);
    try {
      await onSave(categoriaId as Id<"categorias">, valor);
      onClose();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`Definir limite · ${monthLabelLong(mes)}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Categoria</label>
          <CategoriaSelect
            categorias={categorias}
            value={categoriaId}
            onChange={(id) => setCategoriaId(id)}
            required
            ariaLabel="Selecione a categoria"
          />
        </div>
        <Input
          label="Valor do limite"
          inputMode="decimal"
          placeholder="0,00"
          value={valorTexto}
          onChange={(e) => setValorTexto(e.target.value)}
          autoFocus
        />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar limite"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
