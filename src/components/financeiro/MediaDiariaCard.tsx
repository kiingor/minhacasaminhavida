"use client";
import { TrendingDown } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

interface Props {
  data?: { mediaDiaria: number; projecaoMes: number; saldoProjetado: number; isMesAtual: boolean; diaReferencia: number; diasNoMes: number; totalAtual: number };
}

export function MediaDiariaCard({ data }: Props) {
  if (!data) return null;
  const semDados = data.totalAtual === 0;
  const sinalSaldo = data.saldoProjetado < 0 ? "-" : "+";

  return (
    <Card as="section" aria-labelledby="media-diaria">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold">
        <TrendingDown size={14} aria-hidden />
        <h2 id="media-diaria">Média diária</h2>
      </div>

      {semDados ? (
        <div className="mt-3 text-sm text-ink-400">Sem gastos registrados</div>
      ) : (
        <>
          <div className="mt-2 font-display text-xl font-bold text-ink-900 font-mono">
            {formatBRL(data.mediaDiaria)}
            <span className="text-sm font-sans text-ink-400 font-normal"> / dia</span>
          </div>
          <div className="text-xs text-ink-400">
            {data.isMesAtual ? `${data.diaReferencia} de ${data.diasNoMes} dias` : `${data.diasNoMes} dias`}
          </div>

          {data.isMesAtual ? (
            <>
              <hr className="my-3 border-dashed border-cream-200" />
              <div className="text-[10px] text-ink-400 uppercase tracking-[0.12em] font-semibold">Projeção do mês</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-lg text-ink-900">{formatBRL(data.projecaoMes)}</span>
                <Pill tone={data.saldoProjetado < 0 ? "dark" : "coral"}>
                  Saldo: {sinalSaldo}{formatBRL(Math.abs(data.saldoProjetado))}
                </Pill>
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-ink-400 italic">Mês fechado — sem projeção</div>
          )}
        </>
      )}
    </Card>
  );
}
