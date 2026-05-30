"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  MoreVertical,
} from "lucide-react";
import { formatBRL, formatDate } from "@/lib/formatters";
import { iconeDaCategoria } from "@/lib/categoriaIcons";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

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

interface CategoriaInfo { nome: string; cor: string; icone?: string }
interface ContaInfo { nome: string }
interface PagadorInfo { nome: string; apelido?: string }
interface PessoaInfo { nome: string; apelido?: string; fotoUrl?: string; corTema: string }

interface Props {
  item: LancamentoItemData;
  selecionado: boolean;
  onToggleSelecao: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  /** Desfaz a efetivação. Só é exibido quando o item está efetivado (pago/recebido). */
  onDesfazerEfetivacao?: () => void;
  categoria?: CategoriaInfo;
  conta?: ContaInfo;
  pagador?: PagadorInfo;
  pessoa?: PessoaInfo;
  index?: number;
  /** Quando true, omite a data do subtexto (a lista usa agrupamento por dia). */
  ocultarData?: boolean;
}

export function LancamentoItem({
  item, selecionado, onToggleSelecao, onEditar, onExcluir, onDesfazerEfetivacao,
  categoria, conta, pagador, pessoa, index = 0, ocultarData = false,
}: Props) {
  const efetivado =
    item.tipo === "despesa" ? item.pago :
    item.tipo === "receita" ? item.recebido : true;

  const sinal = item.tipo === "receita" ? "+" : item.tipo === "despesa" ? "-" : "";

  // Cor do valor por tipo: entrada (receita) verde, saída (despesa) vermelho,
  // transferência neutra. Efetivado usa um tom mais suave, mantendo a cor.
  const valorColor =
    item.tipo === "receita"
      ? efetivado ? "text-emerald-400" : "text-emerald-600"
      : item.tipo === "despesa"
      ? efetivado ? "text-rose-300" : "text-rose-600"
      : "text-ink-700";

  const IconCat = iconeDaCategoria(categoria?.icone);

  // Sub-detalhes inline (parcela, cartão, fixa)
  const subDetalhes: string[] = [];
  if (item.tipo !== "transferencia" && item.parcelaAtual) {
    subDetalhes.push(`${item.parcelaAtual}/${item.totalParcelas}`);
  }
  if (item.tipo !== "transferencia" && item.ehFixa) subDetalhes.push("fixa");
  if (item.tipo === "despesa" && item.cartao) subDetalhes.push(item.cartao);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: Math.min(index * 0.015, 0.15) }}
      className={cn(
        "group rounded-2xl bg-white px-3 py-2.5 flex items-center gap-3 transition-all",
        "hover:bg-cream-50",
        selecionado && "bg-coral-50 ring-1 ring-coral-300",
      )}
    >
      {/* Checkbox */}
      <button
        role="checkbox"
        aria-checked={selecionado}
        aria-label={selecionado ? "Desmarcar lançamento" : "Selecionar lançamento"}
        onClick={onToggleSelecao}
        className={cn(
          "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
          selecionado
            ? "bg-coral-500 border-coral-500 text-white"
            : "border-cream-300 hover:border-coral-400 opacity-50 group-hover:opacity-100",
        )}
      >
        {selecionado && <Check size={11} strokeWidth={3} />}
      </button>

      {/* Avatar da categoria / tipo */}
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          item.tipo === "transferencia"
            ? "bg-cream-100 text-ink-700"
            : efetivado ? "bg-cream-50 text-ink-400" : "bg-cream-100 text-ink-800",
        )}
      >
        {item.tipo === "transferencia"
          ? <ArrowLeftRight size={15} />
          : <IconCat size={15} />}
      </div>

      {/* Corpo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-medium text-[13px] truncate text-ink-900",
              efetivado && item.tipo !== "transferencia" && "text-ink-400 line-through decoration-1",
            )}
          >
            {item.descricao}
          </span>

          {/* Pessoa pagadora — só avatar mini */}
          {item.tipo === "despesa" && pessoa && (
            <span
              className="shrink-0 inline-flex items-center"
              title={`Pago por ${pessoa.apelido ?? pessoa.nome}`}
            >
              {pessoa.fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pessoa.fotoUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
              ) : (
                <span
                  className="w-3.5 h-3.5 rounded-full text-white text-[7px] flex items-center justify-center font-bold"
                  style={{ background: pessoa.corTema }}
                  aria-hidden
                >
                  {(pessoa.apelido ?? pessoa.nome).slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="text-[11px] text-ink-400 truncate leading-tight mt-0.5">
          {item.tipo === "transferencia" ? (
            <>
              <span>{item.contaOrigemNome}</span>
              <span className="mx-1 opacity-50">→</span>
              <span>{item.contaDestinoNome}</span>
              {!ocultarData && (<><Sep /><span>{formatDate(item.dataRef)}</span></>)}
            </>
          ) : (
            <>
              {categoria ? <span>{categoria.nome}</span> : <span className="italic">sem categoria</span>}
              {conta && (<><Sep /><span>{conta.nome}</span></>)}
              {item.tipo === "receita" && (pagador || item.pagadorNome) && (
                <><Sep /><span>de {pagador ? pagador.apelido ?? pagador.nome : item.pagadorNome}</span></>
              )}
              {subDetalhes.map((d) => (<span key={d}><Sep />{d}</span>))}
              {!ocultarData && (<><Sep /><span>{formatDate(item.dataRef)}</span></>)}
            </>
          )}
        </div>
      </div>

      {/* Valor */}
      <div className="flex flex-col items-end shrink-0">
        <span className={cn("font-mono font-bold text-[13px] tabular-nums", valorColor)}>
          {sinal}{formatBRL(item.valor)}
        </span>
        {item.tipo !== "transferencia" && (
          <StatusDot efetivado={efetivado} tipo={item.tipo} />
        )}
      </div>

      {/* Ações — menu com rótulos (Editar / Desfazer / Excluir) */}
      <AcoesMenu
        mostrarDesfazer={efetivado && item.tipo !== "transferencia" && !!onDesfazerEfetivacao}
        tipoLabel={item.tipo === "despesa" ? "pagamento" : "recebimento"}
        onEditar={onEditar}
        onExcluir={onExcluir}
        onDesfazer={onDesfazerEfetivacao}
      />
    </motion.li>
  );
}

function AcoesMenu({
  mostrarDesfazer, tipoLabel, onEditar, onExcluir, onDesfazer,
}: {
  mostrarDesfazer: boolean;
  tipoLabel: string;
  onEditar: () => void;
  onExcluir: () => void;
  onDesfazer?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [montado, setMontado] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMontado(true), []);

  function abrir() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => setOpen(false);
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function acao(fn?: () => void) {
    setOpen(false);
    fn?.();
  }

  return (
    <div
      className="shrink-0 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
      style={open ? { opacity: 1 } : undefined}
    >
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : abrir())}
        className="w-7 h-7 rounded-full flex items-center justify-center text-ink-400 hover:bg-cream-100 hover:text-ink-700"
        aria-label="Mais ações"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical size={16} />
      </button>
      {montado && open && pos && createPortal(
        <div
          role="menu"
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 70 }}
          className="w-48 rounded-2xl bg-white shadow-card border border-cream-200 p-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MenuItem icon={Pencil} label="Editar" onClick={() => acao(onEditar)} />
          {mostrarDesfazer && (
            <MenuItem icon={RotateCcw} label={`Desfazer ${tipoLabel}`} onClick={() => acao(onDesfazer)} />
          )}
          <MenuItem icon={Trash2} label="Excluir" tone="danger" onClick={() => acao(onExcluir)} />
        </div>,
        document.body
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon, label, onClick, tone = "normal",
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  tone?: "normal" | "danger";
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-colors",
        tone === "danger" ? "text-rose-600 hover:bg-rose-50" : "text-ink-700 hover:bg-cream-100",
      )}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function Sep() {
  return <span className="mx-1 opacity-50">·</span>;
}

function StatusDot({ efetivado, tipo }: { efetivado: boolean; tipo: "despesa" | "receita" }) {
  const label = efetivado
    ? (tipo === "despesa" ? "Pago" : "Recebido")
    : "Pendente";
  return (
    <span className={cn(
      "text-[9px] uppercase tracking-wide font-semibold mt-0.5 flex items-center gap-1",
      efetivado ? "text-ink-300" : "text-coral-600",
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        efetivado ? "bg-ink-300" : "bg-coral-500",
      )} />
      {label}
    </span>
  );
}

// Componente de cabeçalho de tipo (mantido pra retro-compat se outras telas usarem)
export function TipoIcon({ tipo }: { tipo: "despesa" | "receita" | "transferencia" }) {
  if (tipo === "receita") return <ArrowUpRight size={14} className="text-ink-700" />;
  if (tipo === "despesa") return <ArrowDownRight size={14} className="text-ink-700" />;
  return <ArrowLeftRight size={14} className="text-ink-700" />;
}
