"use client";
import { useEffect, useState } from "react";
import { currentMonth } from "./monthUtils";

const STORAGE_KEY = "mcmv_mes_selecionado";

/**
 * Hook que sincroniza o mês selecionado (YYYY-MM) com localStorage.
 * F5 mantém o mês que o usuário tava olhando — útil quando ele vai
 * navegando entre meses pra planejar.
 *
 * Se o valor salvo for mais antigo que 6 meses do mês atual, ignora
 * e usa o mês corrente (evita ficar preso em mês de 2 anos atrás).
 */
export function usePersistedMes(): [string, (mes: string) => void] {
  const [mes, setMesState] = useState<string>(() => currentMonth());
  const [hidratado, setHidratado] = useState(false);

  // Hidrata após mount (SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && /^\d{4}-\d{2}$/.test(raw)) {
        // Guard contra valores muito antigos (>6 meses atrás)
        const [y, m] = raw.split("-").map(Number);
        const [cy, cm] = currentMonth().split("-").map(Number);
        const diff = (cy - y) * 12 + (cm - m);
        if (Math.abs(diff) <= 6) {
          setMesState(raw);
        }
      }
    } catch { /* ignora */ }
    setHidratado(true);
  }, []);

  // Persiste mudanças
  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, mes);
    } catch { /* ignora */ }
  }, [mes, hidratado]);

  return [mes, setMesState];
}
