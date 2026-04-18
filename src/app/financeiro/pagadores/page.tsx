"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Users, ChevronLeft, Download } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PagadorForm, iconeDoPagador } from "@/components/financeiro/PagadorForm";

type Tipo = "pessoa_fisica" | "pessoa_juridica" | "outro";
type Filtro = "todos" | Tipo;

const LABEL_TIPO: Record<Tipo, string> = {
  pessoa_fisica: "Pessoa Física",
  pessoa_juridica: "Empresa",
  outro: "Outro",
};

interface PagadorItem {
  _id: Id<"pagadores">;
  nome: string;
  apelido?: string;
  tipo: Tipo;
  documento?: string;
  cor: string;
  icone?: string;
  observacao?: string;
  ativo: boolean;
}

export default function PagadoresPage() {
  const token = useSessionToken();
  const pagadores = useQuery(api.financeiro.pagadores.list, token ? { sessionToken: token, incluirInativos: true } : "skip");
  const legado = useQuery(api.financeiro.pagadores.contagemLegado, token ? { sessionToken: token } : "skip");
  const migrar = useMutation(api.financeiro.pagadores.migrarPagadoresLegados);
  const remove = useMutation(api.financeiro.pagadores.remove);

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PagadorItem | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"pagadores"> | null>(null);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState<string | null>(null);

  async function handleImportar() {
    if (!token || importando) return;
    setImportando(true);
    setMsgImport(null);
    try {
      const r = await migrar({ sessionToken: token });
      setMsgImport(`${r.pagadoresCriados} pagador(es) criado(s), ${r.receitasAtualizadas} receita(s) vinculada(s).`);
    } catch {
      setMsgImport("Erro ao importar.");
    } finally {
      setImportando(false);
    }
  }

  const lista = (pagadores ?? []) as PagadorItem[];
  const filtradas = lista.filter((p) => filtro === "todos" ? true : p.tipo === filtro);
  const contagem: Record<Filtro, number> = {
    todos: lista.length,
    pessoa_fisica: lista.filter((p) => p.tipo === "pessoa_fisica").length,
    pessoa_juridica: lista.filter((p) => p.tipo === "pessoa_juridica").length,
    outro: lista.filter((p) => p.tipo === "outro").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Users size={28} className="text-primary" /> Pagadores
          </h1>
          <p className="text-slate-500">Organize quem te paga</p>
        </div>
        <div className="flex gap-2">
          {legado && legado.nomesDistintos > 0 && (
            <Button variant="outline" onClick={handleImportar} disabled={importando}>
              <Download size={16} /> {importando ? "Importando..." : "Importar das receitas"}
            </Button>
          )}
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={16} /> Novo
          </Button>
        </div>
      </div>

      {legado && legado.nomesDistintos > 0 && !msgImport && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          Encontramos <strong>{legado.nomesDistintos}</strong> nome(s) de pagador em receitas existentes. Quer importar como registros?
        </div>
      )}

      {msgImport && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
          {msgImport}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(["todos", "pessoa_fisica", "pessoa_juridica", "outro"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              filtro === f ? "border-primary bg-primary/5 text-primary" : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            {f === "todos" ? "Todos" : LABEL_TIPO[f]}
            <span className="opacity-60">({contagem[f]})</span>
          </button>
        ))}
      </div>

      {pagadores === undefined ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <Users size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-500">Nenhum pagador cadastrado</p>
          <p className="text-sm text-slate-400 mb-4">
            {legado && legado.nomesDistintos > 0
              ? "Importe os que já estão em receitas ou crie manualmente"
              : "Adicione um pagador ou cadastre ao registrar uma receita"}
          </p>
          <div className="flex gap-2 justify-center">
            {legado && legado.nomesDistintos > 0 && (
              <Button variant="outline" onClick={handleImportar} disabled={importando}>
                <Download size={16} /> Importar das receitas
              </Button>
            )}
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus size={16} /> Novo pagador
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtradas.map((p, idx) => {
            const Icon = iconeDoPagador(p.icone);
            return (
              <motion.li
                key={p._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-xl bg-white border p-4 flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${p.cor}20`, color: p.cor }}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{p.apelido ?? p.nome}</span>
                    {!p.ativo && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Inativo</span>}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {p.documento ? p.documento : LABEL_TIPO[p.tipo]}
                  </div>
                </div>
                <button
                  onClick={() => { setEditing(p); setShowForm(true); }}
                  className="p-1.5 rounded text-slate-300 hover:text-primary hover:bg-primary/10"
                  aria-label="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteId(p._id)}
                  className="p-1.5 rounded text-slate-300 hover:text-danger hover:bg-danger/10"
                  aria-label="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <PagadorForm
          onClose={() => { setShowForm(false); setEditing(null); }}
          editData={editing ?? undefined}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (token && deleteId) remove({ sessionToken: token, id: deleteId }); }}
        title="Remover pagador"
        description="Se houver receitas vinculadas, o pagador será arquivado (marcado como inativo). Caso contrário, será excluído."
        confirmLabel="Remover"
      />
    </div>
  );
}
