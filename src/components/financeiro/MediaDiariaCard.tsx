"use client";
import { TrendingDown } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

interface Props {
  data?: { mediaDiaria: number; projecaoMes: number; saldoProjetado: number; isMesAtual: boolean; diaReferencia: number; diasNoMes: number; totalAtual: number };
}

export function MediaDiariaCard({ data }: Props) {
  if (!data) return null;
  const semDados = data.totalAtual === 0;

  return (
    <section aria-labelledby="media-diaria" className="rounded-2xl bg-white border p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
        <TrendingDown size={14} className="text-indigo-500" aria-hidden />
        <h2 id="media-diaria">Média diária</h2>
      </div>
      {semDados ? (
        <div className="mt-3 text-sm text-slate-400">Sem gastos registrados</div>
      ) : (
        <>
          <div className="mt-2 font-display text-xl font-bold font-mono">{formatBRL(data.mediaDiaria)} <span className="text-sm font-sans text-slate-500 font-normal">/ dia</span></div>
          <div className="text-xs text-slate-500">{data.isMesAtual ? `${data.diaReferencia} de ${data.diasNoMes} dias` : `${data.diasNoMes} dias`}</div>

          {data.isMesAtual ? (
            <>
              <hr className="my-3 border-dashed border-slate-100" />
              <div className="text-xs text-slate-400 uppercase font-medium">Projeção do mês</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-semibold text-lg">{formatBRL(data.projecaoMes)}</span>
                {data.saldoProjetado < 0 ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">Saldo: {formatBRL(data.saldoProjetado)}</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Saldo: {formatBRL(data.saldoProjetado)}</span>
                )}
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-slate-400 italic">Mês fechado — sem projeção</div>
          )}
        </>
      )}
    </section>
  );
}
