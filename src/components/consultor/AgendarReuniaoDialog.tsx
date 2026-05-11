"use client";
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { CalendarPlus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "../../../convex/_generated/dataModel";

interface Props {
  open: boolean;
  onClose: () => void;
  familyId: string;
  reuniaoExistente?: {
    _id: Id<"reunioesConsultor">;
    titulo: string;
    dataHora: string;
    duracaoMinutos: number;
    pauta?: string;
  };
}

export function AgendarReuniaoDialog({ open, onClose, familyId, reuniaoExistente }: Props) {
  const token = useSessionToken();
  const agendar = useMutation(api.consultor.agendarReuniao);
  const atualizar = useMutation(api.consultor.atualizarReuniao);

  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("60");
  const [pauta, setPauta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (reuniaoExistente) {
        setTitulo(reuniaoExistente.titulo);
        const dt = new Date(reuniaoExistente.dataHora);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");
        setData(`${yyyy}-${mm}-${dd}`);
        setHora(
          `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
        );
        setDuracao(String(reuniaoExistente.duracaoMinutos));
        setPauta(reuniaoExistente.pauta ?? "");
      } else {
        setTitulo("");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setData(tomorrow.toISOString().slice(0, 10));
        setHora("10:00");
        setDuracao("60");
        setPauta("");
      }
      setError("");
    }
  }, [open, reuniaoExistente]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const dataHora = new Date(`${data}T${hora}:00`).toISOString();
      const duracaoMinutos = parseInt(duracao, 10);
      if (reuniaoExistente) {
        await atualizar({
          sessionToken: token,
          id: reuniaoExistente._id,
          titulo,
          dataHora,
          duracaoMinutos,
          pauta,
        });
      } else {
        await agendar({
          sessionToken: token,
          familyId,
          titulo,
          dataHora,
          duracaoMinutos,
          pauta: pauta.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agendar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={reuniaoExistente ? "Editar reunião" : "Agendar reunião"}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
          placeholder="Ex: Revisão mensal de orçamento"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
          <Input
            label="Hora"
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            required
          />
        </div>
        <Input
          label="Duração (minutos)"
          type="number"
          min={15}
          max={480}
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Pauta (opcional)</label>
          <textarea
            value={pauta}
            onChange={(e) => setPauta(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Tópicos a discutir..."
          />
        </div>
        {error && (
          <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <CalendarPlus size={16} />
            {loading ? "Salvando..." : reuniaoExistente ? "Salvar" : "Agendar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
