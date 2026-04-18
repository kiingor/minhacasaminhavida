"use client";
import { Dialog } from "@/components/ui/dialog";
import { formatBRL, formatDate } from "@/lib/formatters";
import { Check, Clock } from "lucide-react";

interface ParcelaInfo {
  parcela: number;
  total: number;
  mes: string;
  valor: number;
  pago: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  descricao: string;
  dataInicio: string;
  totalParcelas: number;
  parcelaAtual: number;
  valor: number;
  tipo: "despesa" | "receita";
}

function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ParcelasView({ open, onClose, descricao, dataInicio, totalParcelas, parcelaAtual, valor, tipo }: Props) {
  const mesInicio = dataInicio.slice(0, 7);
  const dia = dataInicio.slice(8, 10);
  const hoje = new Date().toISOString().slice(0, 7);

  const parcelas: ParcelaInfo[] = [];
  for (let i = 0; i < totalParcelas; i++) {
    const offset = i - (parcelaAtual - 1);
    const mes = shiftMonth(mesInicio, offset);
    parcelas.push({
      parcela: i + 1,
      total: totalParcelas,
      mes: `${mes}-${dia}`,
      valor,
      pago: mes < hoje,
    });
  }

  const totalValor = valor * totalParcelas;
  const pagas = parcelas.filter((p) => p.pago).length;

  return (
    <Dialog open={open} onClose={onClose} title={`Parcelas: ${descricao}`} className="max-h-[90vh] overflow-y-auto">
      <div className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total da compra</span>
          <span className={`font-mono font-bold ${tipo === "despesa" ? "text-danger" : "text-success"}`}>{formatBRL(totalValor)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Progresso</span>
          <span className="text-slate-700 font-medium">{pagas}/{totalParcelas} pagas</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${(pagas / totalParcelas) * 100}%` }}
          />
        </div>

        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {parcelas.map((p) => {
            const isCurrent = p.mes.slice(0, 7) === hoje;
            return (
              <li
                key={p.parcela}
                className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                  isCurrent ? "bg-primary/5 border border-primary/20" : p.pago ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {p.pago ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Clock size={14} className="text-slate-400" />
                  )}
                  <span className="font-medium">{p.parcela}/{p.total}</span>
                  <span className="text-xs text-slate-500">{formatDate(p.mes)}</span>
                  {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Atual</span>}
                </div>
                <span className="font-mono text-xs font-semibold">{formatBRL(p.valor)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
