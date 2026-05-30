"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Wallet, ListChecks, Target, Users, Flame, Award,
  AlertCircle, ArrowDownCircle, ArrowUpCircle, Tv2, Trophy,
  Zap, Calendar, ArrowRight,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useSession, useSessionToken } from "@/contexts/SessionContext";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { LucideIcon as LucideIconDynamic } from "@/components/tarefas/LucideIcon";
import { getTituloByNivel } from "@/lib/levelTitles";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Pill } from "@/components/ui/pill";
import { formatBRL, formatDate, todayISO } from "@/lib/formatters";
import { currentMonth } from "@/lib/monthUtils";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  return `${diff}d atrás`;
}

export default function Home() {
  const token = useSessionToken();
  const { session } = useSession();
  const hoje = todayISO();
  const mes = currentMonth();

  const pessoas = useQuery(api.pessoas.ranking, token ? { sessionToken: token } : "skip");
  const pessoasList = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");
  const resumo = useQuery(api.financeiro.dashboardFinanceiro.resumoMes, token ? { sessionToken: token, mes } : "skip");
  const saldoEfetivado = useQuery(api.financeiro.dashboardFinanceiro.saldoEfetivado, token ? { sessionToken: token } : "skip");
  const proximas = useQuery(api.financeiro.dashboardFinanceiro.proximasContas, token ? { sessionToken: token } : "skip");
  const taxas = useQuery(api.tarefas.dashboardTarefas.taxaConclusao, token ? { sessionToken: token } : "skip");
  const conquistas = useQuery(api.tarefas.dashboardTarefas.conquistasRecentes, token ? { sessionToken: token } : "skip");
  const lancamentosHoje = useQuery(api.tarefas.lancamentos.listByDate, token ? { sessionToken: token, data: hoje } : "skip");

  const ativas = pessoasList?.filter((p) => p.ativo) ?? [];
  const totalHoje = lancamentosHoje?.length ?? 0;
  const feitasHoje = lancamentosHoje?.filter((l) => l.completada).length ?? 0;
  const xpFamilia = ativas.reduce((s, p) => s + p.xpTotal, 0);
  const maiorStreak = ativas.reduce((max, p) => Math.max(max, p.streakDias), 0);

  const tarefasPorPessoa = ativas.map((p) => {
    const lancs = lancamentosHoje?.filter((l) => l.pessoaId === p._id) ?? [];
    return { pessoa: p, total: lancs.length, feitas: lancs.filter((l) => l.completada).length };
  });

  const firstName = session?.name?.split(" ")[0] ?? "família";
  const sinalSaldo = saldoEfetivado && saldoEfetivado.valor < 0 ? "-" : "";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="py-6 md:py-10 space-y-6">

      <motion.section variants={item} className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr] items-center">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl border border-cream-200 bg-white flex flex-col items-center justify-center shadow-soft">
            <span className="font-display font-extrabold text-lg leading-none text-ink-900">{new Date().getDate()}</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs text-ink-400 capitalize">{new Date().toLocaleDateString("pt-BR", { weekday: "short" })}</span>
            <span className="font-semibold text-sm text-ink-900 capitalize">{new Date().toLocaleDateString("pt-BR", { month: "long" })}</span>
          </div>
        </div>
        <div className="md:text-right">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink-900 leading-tight">
            Olá, {firstName}! <span aria-hidden>👋</span>
          </h1>
          <p className="text-ink-400 mt-1">
            {proximas && proximas.length > 0
              ? `${proximas.length} conta${proximas.length > 1 ? "s" : ""} aguardando você`
              : "Tudo certo por aqui hoje"}
          </p>
        </div>
      </motion.section>

      <motion.section variants={item} className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {saldoEfetivado ? (
          <Stat
            label="Saldo nas contas"
            icon={Wallet}
            tone="dark"
            hint={`${saldoEfetivado.contasAtivas} ${saldoEfetivado.contasAtivas === 1 ? "conta" : "contas"}`}
            value={<span className="font-mono">{sinalSaldo}{formatBRL(Math.abs(saldoEfetivado.valor))}</span>}
          />
        ) : <Skeleton className="h-32 rounded-3xl" />}

        <Stat
          label="Tarefas hoje"
          icon={ListChecks}
          tone="white"
          value={<>{taxas?.taxaHoje ?? 0}<span className="text-2xl text-ink-400">%</span></>}
          hint={`${feitasHoje} de ${totalHoje}`}
        />

        <Stat
          label="XP da família"
          icon={Zap}
          tone="coral"
          value={xpFamilia.toLocaleString("pt-BR")}
        />

        <Stat
          label="Maior streak"
          icon={Flame}
          tone="white"
          value={<>{maiorStreak}<span className="text-2xl text-ink-400 ml-1">d</span></>}
        />
      </motion.section>

      <motion.section variants={item} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
              <ListChecks size={20} className="text-coral-500" /> Tarefas do dia
            </h2>
            <Link href="/tarefas/hoje" className="text-xs font-semibold text-coral-600 hover:text-coral-700 inline-flex items-center gap-1">
              Abrir <ArrowRight size={12} />
            </Link>
          </div>
          {lancamentosHoje === undefined ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : totalHoje === 0 ? (
            <div className="text-center py-8 text-ink-300 text-sm">Nenhuma tarefa hoje</div>
          ) : (
            <div className="space-y-4">
              {tarefasPorPessoa.filter((t) => t.total > 0).map(({ pessoa, total, feitas }) => {
                const pct = Math.round((feitas / total) * 100);
                return (
                  <div key={pessoa._id} className="flex items-center gap-3">
                    <PersonAvatar pessoa={pessoa} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-ink-900 truncate">{pessoa.apelido ?? pessoa.nome.split(" ")[0]}</span>
                        <span className="text-xs font-mono font-bold text-ink-900">{feitas}/{total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden mt-1.5">
                        <motion.div
                          className={pct === 100 ? "h-full rounded-full bg-coral-500" : "h-full rounded-full bg-ink-900"}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
              <Wallet size={20} className="text-coral-500" /> Finanças
            </h2>
            <Link href="/financeiro" className="text-xs font-semibold text-coral-600 hover:text-coral-700 inline-flex items-center gap-1">
              Ver mais <ArrowRight size={12} />
            </Link>
          </div>
          {resumo === undefined ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
          ) : (
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-ink-500 flex items-center gap-2 font-medium"><ArrowUpCircle size={14} /> A receber</span>
                <span className="font-mono font-bold text-ink-900">{formatBRL(resumo.aReceber)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-ink-500 flex items-center gap-2 font-medium"><ArrowDownCircle size={14} /> A pagar</span>
                <span className="font-mono font-bold text-ink-900">-{formatBRL(resumo.aPagar)}</span>
              </div>
            </div>
          )}

          {proximas === undefined ? (
            <Skeleton className="h-20" />
          ) : proximas.length === 0 ? (
            <div className="text-center py-3 text-ink-300 text-xs">Nenhuma conta pendente</div>
          ) : (
            <div className="mt-4 pt-4 border-t border-cream-200">
              <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-[0.12em] mb-2">Próximas contas</div>
              <ul className="space-y-2">
                {proximas.slice(0, 5).map((d) => (
                  <li key={d._id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle size={12} className="text-ink-400 shrink-0" />
                      <span className="truncate text-ink-700 min-w-0">{d.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-ink-400">{formatDate(d.dataVencimento)}</span>
                      <span className="font-mono font-bold text-ink-900">{formatBRL(d.valor)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </motion.section>

      <motion.section variants={item} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
              <Award size={20} className="text-coral-500" /> Conquistas
            </h2>
          </div>
          {conquistas === undefined ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : conquistas.length === 0 ? (
            <div className="text-center py-8 text-ink-300 text-sm">
              <Award size={32} className="mx-auto mb-2 opacity-30" />
              Complete tarefas para desbloquear conquistas
            </div>
          ) : (
            <ul className="space-y-3">
              {conquistas.slice(0, 5).map((c) => (
                <li key={c._id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-coral-500 text-white flex items-center justify-center shrink-0">
                    <LucideIconDynamic name={c.icone} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink-900 truncate">{c.nome}</div>
                    <div className="text-[11px] text-ink-400">{c.pessoaNome} · {timeAgo(c.desbloqueadaEm)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
              <Trophy size={20} className="text-coral-500" /> Ranking
            </h2>
            <Link href="/tarefas" className="text-xs font-semibold text-coral-600 hover:text-coral-700 inline-flex items-center gap-1">
              Completo <ArrowRight size={12} />
            </Link>
          </div>
          {pessoas === undefined ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : pessoas.length === 0 ? (
            <div className="text-center py-8 text-ink-300 text-sm">Cadastre pessoas para ver o ranking</div>
          ) : (
            <ul className="space-y-3">
              {pessoas.slice(0, 5).map((p, i) => {
                const titulo = getTituloByNivel(p.nivelAtual);
                return (
                  <li key={p._id} className="flex items-center gap-3">
                    <span className={`font-display font-extrabold text-lg w-6 text-center ${i === 0 ? "text-coral-500" : "text-ink-300"}`}>
                      {i + 1}
                    </span>
                    <PersonAvatar pessoa={p} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink-900 truncate">{p.apelido ?? p.nome.split(" ")[0]}</span>
                        <Pill tone="neutral" size="xs">Nv {p.nivelAtual}</Pill>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-ink-400 mt-0.5">
                        <span>{titulo.titulo}</span>
                        {p.streakDias >= 2 && (
                          <span className="inline-flex items-center gap-0.5 text-ink-700 font-semibold">
                            <Flame size={10} />{p.streakDias}d
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm text-ink-900">{p.xpTotal.toLocaleString("pt-BR")}</div>
                      <div className="text-[10px] text-ink-400 uppercase tracking-wide">XP</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </motion.section>

      <motion.section variants={item}>
        <h2 className="font-display font-bold text-lg text-ink-900 mb-3">Atalhos</h2>
        <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
          {[
            { href: "/tarefas/hoje",          label: "Tarefas",  icon: ListChecks },
            { href: "/financeiro/despesas",   label: "Despesas", icon: ArrowDownCircle },
            { href: "/financeiro/receitas",   label: "Receitas", icon: ArrowUpCircle },
            { href: "/financeiro/metas",      label: "Metas",    icon: Target },
            { href: "/tv",                    label: "Modo Painel", icon: Tv2, target: "_blank" as const },
            { href: "/pessoas",               label: "Pessoas",  icon: Users },
          ].map(({ href, label, icon: Icon, target }) => (
            <Link
              key={href}
              href={href}
              target={target}
              className="group rounded-3xl bg-white shadow-soft p-4 flex flex-col items-center gap-2 hover:shadow-card hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 rounded-full bg-cream-100 group-hover:bg-coral-500 text-ink-700 group-hover:text-white flex items-center justify-center transition-colors">
                <Icon size={18} />
              </div>
              <span className="text-xs font-semibold text-ink-700">{label}</span>
            </Link>
          ))}
        </div>
      </motion.section>

      <motion.div variants={item} className="flex items-center gap-2 justify-center text-[11px] text-ink-300 pt-2">
        <Calendar size={12} />
        {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </motion.div>
    </motion.div>
  );
}
