import { useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useSessionToken } from "@/contexts/SessionContext";

interface LevelUpEvent {
  id: Id<"levelUps">;
  nivelAnterior: number;
  nivelNovo: number;
  tituloNovo: string;
  pessoaId: Id<"pessoas">;
}

export function useLevelUp(pessoaId: Id<"pessoas">, onLevelUp: (ev: LevelUpEvent) => void) {
  const token = useSessionToken();
  const pendentes = useQuery(
    api.tarefas.lancamentos.levelUpsPendentes,
    token ? { sessionToken: token, pessoaId } : "skip"
  );
  const marcar = useMutation(api.tarefas.lancamentos.marcarLevelUpVisualizado);

  useEffect(() => {
    if (!pendentes || pendentes.length === 0 || !token) return;
    const first = pendentes[0];
    onLevelUp({
      id: first._id,
      nivelAnterior: first.nivelAnterior,
      nivelNovo: first.nivelNovo,
      tituloNovo: first.tituloNovo,
      pessoaId: first.pessoaId,
    });
    marcar({ sessionToken: token, id: first._id });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendentes]);
}
