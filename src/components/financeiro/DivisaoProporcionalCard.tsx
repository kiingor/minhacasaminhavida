"use client";
import { motion } from "framer-motion";
import { Scale, ArrowUp, ArrowDown, Info } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

interface PessoaData {
  pessoaId: string;
  nome: string;
  fotoUrl?: string;
  corTema: string;
  renda: number;
  rendaPercentual: number;
  despesasPercentual: number;
  sugerido: number;
  real: number;
  diff: number;
}

interface Data {
  semDados: boolean;
  totalRenda: number;
  totalDespesas: number;
  pessoas: PessoaData[];
}

interface Props {
  data?: Data;
}

// Tolerancia para considerar "balanceado" (R$ 5,00 = 500 centavos).
const TOLERANCIA_BALANCEADO = 500;

export function DivisaoProporcionalCard({ data }: Props) {
  if (!data) return null;

  if (data.semDados) {
    return (
      <section
        aria-labelledby="divisao-titulo"
        className="rounded-2xl bg-white border p-5 shadow-sm h-full"
      >
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <Scale size={14} className="text-primary" aria-hidden />
          <h2 id="divisao-titulo">Divisão proporcional à renda</h2>
        </div>
        <div className="mt-6 text-center text-sm text-slate-400 py-6">
          Cadastre receitas com pagador para ver sugestão.
          <p className="text-xs text-slate-300 mt-1">
            A divisão proporcional usa a renda recebida no mês como base.
          </p>
        </div>
      </section>
    );
  }

  if (data.pessoas.length === 0) {
    return (
      <section
        aria-labelledby="divisao-titulo"
        className="rounded-2xl bg-white border p-5 shadow-sm h-full"
      >
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <Scale size={14} className="text-primary" aria-hidden />
          <h2 id="divisao-titulo">Divisão proporcional à renda</h2>
        </div>
        <div className="mt-6 text-center text-sm text-slate-400 py-6">
          Nenhum dado para sugerir divisão neste mês.
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="divisao-titulo"
      className="rounded-2xl bg-white border p-5 shadow-sm h-full"
    >
      <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
        <Scale size={14} className="text-primary" aria-hidden />
        <h2 id="divisao-titulo">Divisão proporcional à renda</h2>
      </div>

      <ul className="mt-4 space-y-3">
        {data.pessoas.map((p, i) => {
          const balanceado = Math.abs(p.diff) <= TOLERANCIA_BALANCEADO;
          const pagouMais = !balanceado && p.diff > 0;
          const corStatus = balanceado
            ? "text-slate-500 bg-slate-100"
            : pagouMais
            ? "text-rose-700 bg-rose-50"
            : "text-emerald-700 bg-emerald-50";
          const IconStatus = balanceado ? Scale : pagouMais ? ArrowUp : ArrowDown;
          const labelStatus = balanceado
            ? "Equilibrado"
            : pagouMais
            ? `Pagou ${formatBRL(p.diff)} a mais`
            : `Pagou ${formatBRL(Math.abs(p.diff))} a menos`;

          return (
            <motion.li
              key={p.pessoaId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-100 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                {p.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.fotoUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: p.corTema }}
                    aria-hidden
                  >
                    {p.nome.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{p.nome}</div>
                  <div className="text-[11px] text-slate-500">
                    <span title="% da renda familiar">{p.rendaPercentual}% renda</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span title="% das despesas pagas">
                      {p.despesasPercentual}% despesas
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 shrink-0 ${corStatus}`}
                >
                  <IconStatus size={10} />
                  {labelStatus}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pl-10">
                <div>
                  <div className="text-[10px] uppercase text-slate-400 tracking-wide">
                    Sugerido
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-700">
                    {formatBRL(p.sugerido)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400 tracking-wide">
                    Real
                  </div>
                  <div className="text-xs font-mono font-semibold text-slate-700">
                    {formatBRL(p.real)}
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
        <Info size={11} className="shrink-0 mt-0.5" aria-hidden />
        <p>
          Sugerido = % renda × total de despesas pagas. Use como referência para dividir
          proporcionalmente.
        </p>
      </div>
    </section>
  );
}
