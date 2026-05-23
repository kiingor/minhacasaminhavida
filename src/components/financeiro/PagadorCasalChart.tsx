"use client";
import { motion } from "framer-motion";
import { Users, UserX } from "lucide-react";
import { formatBRL } from "@/lib/formatters";

interface Item {
  pessoaId: string;
  nome: string;
  totalPago: number;
  qtd: number;
  fotoUrl?: string;
  corTema: string;
  removida: boolean;
  percentual: number;
}

interface Props {
  data?: Item[];
}

export function PagadorCasalChart({ data }: Props) {
  if (!data) return null;

  if (data.length === 0) {
    return (
      <section
        aria-labelledby="pagador-casal-titulo"
        className="rounded-2xl bg-white border p-5 shadow-sm h-full"
      >
        <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
          <Users size={14} className="text-primary" aria-hidden />
          <h2 id="pagador-casal-titulo">Quem pagou este mês</h2>
        </div>
        <div className="mt-6 text-center text-sm text-slate-400 py-6">
          Nenhuma despesa atribuída este mês.
          <p className="text-xs text-slate-300 mt-1">
            Marque despesas como pagas e atribua a uma pessoa.
          </p>
        </div>
      </section>
    );
  }

  const maxValor = Math.max(...data.map((d) => d.totalPago), 1);

  return (
    <section
      aria-labelledby="pagador-casal-titulo"
      className="rounded-2xl bg-white border p-5 shadow-sm h-full"
    >
      <div className="flex items-center gap-2 text-xs uppercase text-slate-500 tracking-wide font-medium">
        <Users size={14} className="text-primary" aria-hidden />
        <h2 id="pagador-casal-titulo">Quem pagou este mês</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {data.map((p, i) => {
          const larguraBarra = (p.totalPago / maxValor) * 100;
          const ehSemAtribuicao = p.pessoaId === "__sem_pessoa__";
          return (
            <motion.li
              key={p.pessoaId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="space-y-1.5"
            >
              <div className="flex items-center gap-2">
                {ehSemAtribuicao || p.removida ? (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      p.removida ? "bg-slate-200 text-slate-400" : "bg-slate-100 text-slate-400"
                    }`}
                    aria-hidden
                  >
                    <UserX size={14} />
                  </div>
                ) : p.fotoUrl ? (
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
                <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                  <span
                    className={`text-sm font-medium truncate ${
                      p.removida ? "text-slate-400" : "text-slate-700"
                    }`}
                  >
                    {p.nome}
                    {p.removida && (
                      <span className="text-[10px] ml-1 text-slate-400">(removida)</span>
                    )}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">
                    {p.percentual}%
                  </span>
                </div>
              </div>
              <div
                className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden"
                role="progressbar"
                aria-valuenow={p.percentual}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${p.nome}: ${formatBRL(p.totalPago)} (${p.percentual}%)`}
                title={`${formatBRL(p.totalPago)} · ${p.qtd} ${p.qtd === 1 ? "despesa" : "despesas"}`}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${larguraBarra}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background:
                      ehSemAtribuicao || p.removida
                        ? "#94A3B8"
                        : `linear-gradient(90deg, ${p.corTema}, ${p.corTema}cc)`,
                  }}
                />
              </div>
              <div className="text-[11px] text-slate-500 font-mono pl-10">
                {formatBRL(p.totalPago)}
              </div>
            </motion.li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>Despesas por pagador no mês</caption>
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Valor</th>
            <th>Percentual</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p) => (
            <tr key={p.pessoaId}>
              <td>{p.nome}</td>
              <td>{formatBRL(p.totalPago)}</td>
              <td>{p.percentual}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
