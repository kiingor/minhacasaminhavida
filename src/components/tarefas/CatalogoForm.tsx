"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "./LucideIcon";
import { XP_POR_DIFICULDADE } from "@/lib/xpCalculator";
import { Plus, X, Search } from "lucide-react";

// ─── Ícones disponíveis ───────────────────────────────────────────────────────
const ICONES = [
  "CheckSquare","Star","Sparkles","Brush","Trash2","Droplets","Wind",
  "Utensils","Coffee","Apple","ShoppingCart","ShoppingBag","Car","Bike",
  "Dumbbell","Book","BookOpen","Music","Gamepad2","Dog","Cat","Baby",
  "Heart","Home","Bed","Bath","Shirt","Scissors","Wrench","Hammer",
  "Shovel","Leaf","Flower2","Sun","Moon","Zap","Clock","Calendar",
  "Package","Box","Gift","Flame","Snowflake","Cloudy","UtensilsCrossed",
  "ChefHat","Sandwich","Pizza","Soup","Salad","Egg","Milk","Banana",
  "Recycle","Lightbulb","Plug","Wifi","Phone","Laptop","Monitor",
  "Tv","Camera","Headphones","Mic","Radio","Newspaper","PenLine",
  "Pencil","Backpack","Briefcase","GraduationCap","Stethoscope","Pill",
  "Thermometer","Activity","Brain","Hand","Footprints","Baby","Users",
  "UserCheck","SmilePlus","Trophy","Medal","Target","Flag",
];

// ─── Categorias padrão com cores ─────────────────────────────────────────────
const CATEGORIAS_PADRAO = [
  { nome: "Limpeza", cor: "#06B6D4" },
  { nome: "Cozinha", cor: "#F97316" },
  { nome: "Roupas",  cor: "#8B5CF6" },
  { nome: "Pets",    cor: "#EC4899" },
  { nome: "Jardim",  cor: "#10B981" },
  { nome: "Compras", cor: "#3B82F6" },
  { nome: "Saúde",   cor: "#EF4444" },
  { nome: "Estudos", cor: "#F59E0B" },
  { nome: "Outros",  cor: "#64748B" },
];

function getCor(nome: string, todas: { nome: string; cor: string }[]): string {
  return todas.find((c) => c.nome === nome)?.cor ?? "#64748B";
}

interface Props {
  tarefa?: Doc<"tarefasCatalogo">;
  onClose: () => void;
}

export function CatalogoForm({ tarefa, onClose }: Props) {
  const token = useSessionToken();
  const isEdit = !!tarefa;
  const create = useMutation(api.tarefas.tarefasCatalogo.create);
  const update = useMutation(api.tarefas.tarefasCatalogo.update);

  // Buscar categorias únicas já existentes no catálogo
  const tarefasExistentes = useQuery(
    api.tarefas.tarefasCatalogo.list,
    token ? { sessionToken: token } : "skip"
  );

  // Mescla padrão + customizadas (das tarefas existentes)
  const categoriasCustom: { nome: string; cor: string }[] = [];
  tarefasExistentes?.forEach((t) => {
    const jaExiste = CATEGORIAS_PADRAO.some((c) => c.nome === t.categoria)
      || categoriasCustom.some((c) => c.nome === t.categoria);
    if (!jaExiste) categoriasCustom.push({ nome: t.categoria, cor: t.cor });
  });
  const todasCategorias = [...CATEGORIAS_PADRAO, ...categoriasCustom];

  // ─── Estado ────────────────────────────────────────────────────────────────
  const [nome, setNome] = useState(tarefa?.nome ?? "");
  const [categoria, setCategoria] = useState(tarefa?.categoria ?? CATEGORIAS_PADRAO[0].nome);
  const [tempo, setTempo] = useState(String(tarefa?.tempoExecucaoMinutos ?? 15));
  const [dificuldade, setDificuldade] = useState<"facil" | "media" | "dificil">(tarefa?.dificuldade ?? "facil");
  const [icone, setIcone] = useState(tarefa?.icone ?? "CheckSquare");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Nova categoria inline
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaCor, setNovaCategoriaCor] = useState("#64748B");
  const [showNovaCategoria, setShowNovaCategoria] = useState(false);

  // Pesquisa de ícone
  const [buscaIcone, setBuscaIcone] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);

  const iconesFiltrados = ICONES.filter((i) =>
    buscaIcone === "" || i.toLowerCase().includes(buscaIcone.toLowerCase())
  );

  function confirmarNovaCategoria() {
    const nome = novaCategoriaNome.trim();
    if (!nome) return;
    todasCategorias.push({ nome, cor: novaCategoriaCor });
    setCategoria(nome);
    setNovaCategoriaNome("");
    setShowNovaCategoria(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome obrigatório."); return; }
    if (!token) { setError("Não autenticado."); return; }
    setLoading(true);
    setError("");
    try {
      const xpBase = XP_POR_DIFICULDADE[dificuldade];
      const cor = getCor(categoria, todasCategorias);
      const tempoNum = Math.max(1, parseInt(tempo) || 15);

      if (isEdit) {
        await update({ sessionToken: token, id: tarefa._id, nome, categoria, tempoExecucaoMinutos: tempoNum, dificuldade, xpBase, icone, cor });
      } else {
        await create({ sessionToken: token, nome, categoria, tempoExecucaoMinutos: tempoNum, dificuldade, xpBase, icone, cor, recorrencia: "pontual" });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  const corAtual = getCor(categoria, todasCategorias);

  return (
    <Dialog open onClose={onClose} title={isEdit ? "Editar Tarefa" : "Nova Tarefa"} className="max-h-[90vh] overflow-y-auto max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">

        {/* Nome */}
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />

        {/* Ícone picker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Ícone</label>
          <button
            type="button"
            onClick={() => setShowIconPicker((v) => !v)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-300 hover:border-primary transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `${corAtual}20`, color: corAtual }}
            >
              <LucideIcon name={icone} size={18} />
            </div>
            <span className="text-sm text-slate-600">{icone}</span>
            <span className="ml-auto text-xs text-slate-400">{showIconPicker ? "Fechar" : "Trocar ícone"}</span>
          </button>

          {showIconPicker && (
            <div className="border rounded-xl p-3 space-y-2 bg-slate-50">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar ícone..."
                  value={buscaIcone}
                  onChange={(e) => setBuscaIcone(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {iconesFiltrados.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    title={ic}
                    onClick={() => { setIcone(ic); setShowIconPicker(false); setBuscaIcone(""); }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      icone === ic
                        ? "text-white"
                        : "text-slate-600 hover:bg-white hover:shadow-sm"
                    }`}
                    style={icone === ic ? { background: corAtual } : undefined}
                  >
                    <LucideIcon name={ic} size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Categoria</label>
          <div className="flex gap-1.5 flex-wrap">
            {todasCategorias.map((c) => (
              <button
                key={c.nome}
                type="button"
                onClick={() => setCategoria(c.nome)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                style={{
                  background: categoria === c.nome ? c.cor : "transparent",
                  color: categoria === c.nome ? "white" : "#64748B",
                  borderColor: categoria === c.nome ? c.cor : "#E2E8F0",
                }}
              >
                {c.nome}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowNovaCategoria((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Plus size={11} /> Nova
            </button>
          </div>

          {showNovaCategoria && (
            <div className="flex gap-2 items-center mt-1 p-3 rounded-xl bg-slate-50 border">
              <input
                type="color"
                value={novaCategoriaCor}
                onChange={(e) => setNovaCategoriaCor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                title="Escolher cor"
              />
              <input
                type="text"
                placeholder="Nome da categoria"
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), confirmarNovaCategoria())}
                className="flex-1 px-2 py-1.5 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={confirmarNovaCategoria}
                disabled={!novaCategoriaNome.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setShowNovaCategoria(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Tempo */}
        <Input
          label="Tempo de execução (min)"
          type="number"
          min={1}
          value={tempo}
          onChange={(e) => setTempo(e.target.value)}
          required
        />

        {/* Dificuldade */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Dificuldade</label>
          <div className="flex gap-2">
            {(["facil", "media", "dificil"] as const).map((d) => {
              const colors = { facil: "#10B981", media: "#F59E0B", dificil: "#EF4444" };
              const labels = { facil: "Fácil", media: "Média", dificil: "Difícil" };
              const active = dificuldade === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDificuldade(d)}
                  className="flex-1 py-2 rounded-lg border text-xs font-medium transition-colors"
                  style={{
                    background: active ? `${colors[d]}15` : "transparent",
                    color: active ? colors[d] : "#64748B",
                    borderColor: active ? colors[d] : "#E2E8F0",
                  }}
                >
                  {labels[d]} · {XP_POR_DIFICULDADE[d]} XP
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
