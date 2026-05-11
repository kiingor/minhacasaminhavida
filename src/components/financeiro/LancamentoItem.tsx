"use client";
import { motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CreditCard,
  Pencil,
  Trash2,
} from "lucide-react";
import { formatBRL, formatDate } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { Id } from "../../../convex/_generated/dataModel";

interface BaseItem {
  id: string;
  descricao: string;
  valor: number;
  dataRef: string;
}

interface DespesaItem extends BaseItem {
  tipo: "despesa";
  pago: boolean;
  dataVencimento: string;
  dataPagamento?: string;
  categoriaId: Id<"categorias">;
  contaId?: Id<"contas">;
  cartao?: string;
  pessoaId?: Id<"pessoas">;
  parcelaAtual?: number;
  totalParcelas?: number;
  recorrente?: boolean;
  ehFixa: boolean;
  tipoOriginal: "fixa" | "parcelada" | "avulsa";
  _projectedMes: string;
}

interface ReceitaItem extends BaseItem {
  tipo: "receita";
  recebido: boolean;
  dataPrevisao: string;
  dataRecebimento?: string;
  categoriaId: Id<"categorias">;
  contaId?: Id<"contas">;
  pessoaId: Id<"pessoas">;
  pagadorId?: Id<"pagadores">;
  pagadorNome?: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  recorrente?: boolean;
  ehFixa: boolean;
  tipoOriginal: "fixa" | "parcelada" | "avulsa";
  _projectedMes: string;
}

interface TransferenciaItem extends BaseItem {
  tipo: "transferencia";
  contaOrigemId: Id<"contas">;
  contaDestinoId: Id<"contas">;
  contaOrigemNome: string;
  contaDestinoNome: string;
}

export type LancamentoItemData = DespesaItem | ReceitaItem | TransferenciaItem;

interface CategoriaInfo {
  nome: string;
  cor: string;
  icone?: string;
}

interface ContaInfo {
  nome: string;
}

interface PagadorInfo {
  nome: string;
  apelido?: string;
}

interface PessoaInfo {
  nome: string;
  apelido?: string;
  fotoUrl?: string;
  corTema: string;
}

interface Props {
  item: LancamentoItemData;
  selecionado: boolean;
  onToggleSelecao: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  categoria?: CategoriaInfo;
  conta?: ContaInfo;
  pagador?: PagadorInfo;
  pessoa?: PessoaInfo;
  index?: number;
}

export function LancamentoItem({
  item,
  selecionado,
  onToggleSelecao,
  onEditar,
  onExcluir,
  categoria,
  conta,
  pagador,
  pessoa,
  index = 0,
}: Props) {
  const efetivado =
    item.tipo === "despesa" ? item.pago : item.tipo === "receita" ? item.recebido : true;

  const corValor =
    item.tipo === "receita"
      ? "text-emerald-600"
      : item.tipo === "despesa"
      ? "text-rose-600"
      : "text-violet-600";

  const sinal = item.tipo === "receita" ? "+" : item.tipo === "despesa" ? "-" : "";

  const IconCat = iconeDaCategoria(categoria?.icone);
  const corCat = categoria?.cor ?? "#94A3B8";

  // estilos por estado
  const bgClass =
    item.tipo === "transferencia"
      ? "bg-violet-50/40 border-violet-200/60"
      : efetivado
      ? "bg-emerald-50/50 border-emerald-200/60"
      : "bg-white border-slate-200";

  const dataLabel = formatDate(item.dataRef);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className={`rounded-xl border p-3 sm:p-4 flex items-center gap-2 sm:gap-3 transition-colors ${bgClass} ${
        selecionado ? "ring-2 ring-primary/40 border-primary/40" : ""
      }`}
    >
      {/* Checkbox de selecao */}
      <button
        role="checkbox"
        aria-checked={selecionado}
        aria-label={selecionado ? "Desmarcar lançamento" : "Selecionar lançamento"}
        onClick={onToggleSelecao}
        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
          selecionado
            ? "bg-primary border-primary text-white"
            : "border-slate-300 hover:border-primary"
        }`}
      >
        {selecionado && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            className="w-3.5 h-3.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Icone do tipo + categoria empilhados / juntos */}
      <div className="flex items-center gap-1 shrink-0">
        <IconeTipo tipo={item.tipo} />
        {item.tipo !== "transferencia" && (
          <div
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg hidden sm:flex items-center justify-center"
            style={{ background: `${corCat}1f`, color: corCat }}
            aria-hidden
          >
            <IconCat size={16} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`font-medium text-sm sm:text-base truncate max-w-[200px] sm:max-w-none ${
              efetivado && item.tipo !== "transferencia" ? "line-through text-slate-400" : ""
            }`}
          >
            {item.descricao}
          </span>

          {/* Badges */}
          {item.tipo !== "transferencia" && item.parcelaAtual && (
            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
              {item.parcelaAtual}/{item.totalParcelas}
            </span>
          )}
          {item.tipo !== "transferencia" && item.ehFixa && (
            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
              Fixa
            </span>
          )}
          {item.tipo === "despesa" && item.cartao && (
            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 inline-flex items-center gap-1">
              <CreditCard size={9} />
              {item.cartao}
            </span>
          )}
          {item.tipo === "despesa" && pessoa && (
            <span
              className="text-[10px] sm:text-xs pl-0.5 pr-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1"
              style={{ background: `${pessoa.corTema}1f`, color: pessoa.corTema }}
              title={`Pago por ${pessoa.apelido ?? pessoa.nome}`}
            >
              {pessoa.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pessoa.fotoUrl}
                  alt=""
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
              ) : (
                <span
                  className="w-3.5 h-3.5 rounded-full text-white text-[8px] flex items-center justify-center font-bold"
                  style={{ background: pessoa.corTema }}
                  aria-hidden
                >
                  {(pessoa.apelido ?? pessoa.nome).slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="truncate max-w-[80px]">{pessoa.apelido ?? pessoa.nome}</span>
            </span>
          )}
          {item.tipo === "despesa" &&
            (item.pago ? (
              <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                Pago
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                Pendente
              </span>
            ))}
          {item.tipo === "receita" &&
            (item.recebido ? (
              <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                Recebido
              </span>
            ) : (
              <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                Pendente
              </span>
            ))}
          {item.tipo === "transferencia" && (
            <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
              Transferência
            </span>
          )}
        </div>

        <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
          {item.tipo === "transferencia" ? (
            <>
              <span>{item.contaOrigemNome}</span>
              <span className="mx-1">→</span>
              <span>{item.contaDestinoNome}</span>
              <span className="mx-1">·</span>
              <span>{dataLabel}</span>
            </>
          ) : (
            <>
              {categoria ? (
                <span style={{ color: categoria.cor }}>{categoria.nome}</span>
              ) : (
                <span className="text-slate-400">Categoria removida</span>
              )}
              <span className="mx-1">·</span>
              {conta ? (
                <span>{conta.nome}</span>
              ) : item.contaId ? (
                <span className="text-slate-400">Conta removida</span>
              ) : null}
              {(conta || item.contaId) && <span className="mx-1">·</span>}
              {item.tipo === "receita" && (pagador || item.pagadorNome) && (
                <>
                  <span>de {pagador ? pagador.apelido ?? pagador.nome : item.pagadorNome}</span>
                  <span className="mx-1">·</span>
                </>
              )}
              <span>{dataLabel}</span>
            </>
          )}
        </div>
      </div>

      <div className={`font-mono font-semibold text-sm sm:text-base shrink-0 ${corValor}`}>
        {sinal}
        {formatBRL(item.valor)}
      </div>

      <button
        onClick={onEditar}
        className="p-1.5 rounded text-slate-400 hover:text-primary hover:bg-primary/10 shrink-0"
        aria-label="Editar lançamento"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onExcluir}
        className="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10 shrink-0"
        aria-label="Excluir lançamento"
      >
        <Trash2 size={14} />
      </button>
    </motion.li>
  );
}

function IconeTipo({ tipo }: { tipo: "despesa" | "receita" | "transferencia" }) {
  if (tipo === "receita")
    return <ArrowUpCircle size={20} className="text-emerald-500 shrink-0" aria-label="Receita" />;
  if (tipo === "despesa")
    return <ArrowDownCircle size={20} className="text-rose-500 shrink-0" aria-label="Despesa" />;
  return (
    <ArrowLeftRight size={20} className="text-violet-500 shrink-0" aria-label="Transferência" />
  );
}
