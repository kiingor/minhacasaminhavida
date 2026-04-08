"use client";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload } from "lucide-react";

interface Intervalo {
  inicio: string;
  fim: string;
  descricao: string;
}

const CORES = [
  "#6366F1","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4","#8B5CF6","#F97316",
];

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  pessoa?: Doc<"pessoas">;
  onClose: () => void;
}

export function PersonForm({ pessoa, onClose }: Props) {
  const token = useSessionToken();
  const isEdit = !!pessoa;
  const createPessoa = useMutation(api.pessoas.create);
  const updatePessoa = useMutation(api.pessoas.update);
  const generateUploadUrl = useMutation(api.pessoas.generateUploadUrl);

  const [nome, setNome] = useState(pessoa?.nome ?? "");
  const [apelido, setApelido] = useState(pessoa?.apelido ?? "");
  const [tipo, setTipo] = useState<"titular" | "dependente">(pessoa?.tipo ?? "titular");
  const [corTema, setCorTema] = useState(pessoa?.corTema ?? CORES[0]);
  const [showHorario, setShowHorario] = useState(!!pessoa?.horarioTrabalho);
  const [diasSemana, setDiasSemana] = useState<number[]>(pessoa?.horarioTrabalho?.diasSemana ?? [1,2,3,4,5]);
  const [horaInicio, setHoraInicio] = useState(pessoa?.horarioTrabalho?.horaInicio ?? "08:00");
  const [horaFim, setHoraFim] = useState(pessoa?.horarioTrabalho?.horaFim ?? "18:00");
  const [intervalos, setIntervalos] = useState<Intervalo[]>(pessoa?.horarioTrabalho?.intervalos ?? []);
  const [fotoPreview, setFotoPreview] = useState<string | null>(pessoa?.fotoUrl ?? null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleDia(d: number) {
    setDiasSemana((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  function addIntervalo() {
    setIntervalos([...intervalos, { inicio: "12:00", fim: "13:00", descricao: "Almoço" }]);
  }

  function removeIntervalo(i: number) {
    setIntervalos(intervalos.filter((_, idx) => idx !== i));
  }

  function updateIntervalo(i: number, field: keyof Intervalo, val: string) {
    setIntervalos(intervalos.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório."); return; }
    if (!token) { setError("Não autenticado."); return; }
    setLoading(true);
    setError("");
    try {
      let fotoStorageId: Id<"_storage"> | undefined;
      if (fotoFile) {
        const uploadUrl = await generateUploadUrl({ sessionToken: token });
        const res = await fetch(uploadUrl, { method: "POST", body: fotoFile, headers: { "Content-Type": fotoFile.type } });
        const { storageId } = await res.json();
        fotoStorageId = storageId;
      }

      const horarioTrabalho = showHorario ? {
        diasSemana,
        horaInicio,
        horaFim,
        cargaHorariaDiaria: calcCarga(horaInicio, horaFim, intervalos),
        intervalos: intervalos.length > 0 ? intervalos : undefined,
      } : undefined;

      if (isEdit) {
        await updatePessoa({ sessionToken: token, id: pessoa._id, nome, apelido: apelido || undefined, tipo, corTema, fotoStorageId, horarioTrabalho });
      } else {
        await createPessoa({ sessionToken: token, nome, apelido: apelido || undefined, tipo, corTema, fotoStorageId, horarioTrabalho });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={isEdit ? "Editar Pessoa" : "Nova Pessoa"} className="max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Foto */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 hover:border-primary flex items-center justify-center"
          >
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Upload size={24} className="text-slate-400" />
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          <span className="text-xs text-slate-500">Foto de perfil</span>
        </div>

        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Input label="Apelido (opcional)" value={apelido} onChange={(e) => setApelido(e.target.value)} />

        {/* Tipo */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Tipo</label>
          <div className="flex gap-3">
            {(["titular", "dependente"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${tipo === t ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {t === "titular" ? "Titular" : "Dependente"}
              </button>
            ))}
          </div>
        </div>

        {/* Cor tema */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cor tema</label>
          <div className="flex gap-2 flex-wrap">
            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCorTema(c)}
                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{ background: c, borderColor: corTema === c ? "#1E293B" : "transparent" }}
              />
            ))}
          </div>
        </div>

        {/* Horário de trabalho */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowHorario(!showHorario)}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {showHorario ? "▼" : "▶"} Horário de trabalho
          </button>

          {showHorario && (
            <div className="pl-4 border-l-2 border-primary/20 space-y-3">
              <div className="flex gap-1 flex-wrap">
                {DIAS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDia(i)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${diasSemana.includes(i) ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Início" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
                <Input label="Fim" type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Intervalos</span>
                  <Button type="button" variant="ghost" size="sm" onClick={addIntervalo}>
                    <Plus size={14} /> Adicionar
                  </Button>
                </div>
                {intervalos.map((int, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="time" value={int.inicio} onChange={(e) => updateIntervalo(i, "inicio", e.target.value)} className="h-8 w-24 rounded border border-slate-300 px-2 text-xs" />
                    <span className="text-slate-400 text-xs">até</span>
                    <input type="time" value={int.fim} onChange={(e) => updateIntervalo(i, "fim", e.target.value)} className="h-8 w-24 rounded border border-slate-300 px-2 text-xs" />
                    <input placeholder="Ex: Almoço" value={int.descricao} onChange={(e) => updateIntervalo(i, "descricao", e.target.value)} className="h-8 flex-1 rounded border border-slate-300 px-2 text-xs" />
                    <button type="button" onClick={() => removeIntervalo(i)} className="text-danger hover:bg-danger/10 p-1 rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function calcCarga(inicio: string, fim: string, intervalos: Intervalo[]): number {
  let total = timeToMinutes(fim) - timeToMinutes(inicio);
  for (const int of intervalos) {
    total -= timeToMinutes(int.fim) - timeToMinutes(int.inicio);
  }
  return Math.max(0, total);
}
