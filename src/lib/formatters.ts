// Valores monetários em centavos (integer)
export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseBRL(s: string): number {
  const clean = s.replace(/[^\d,-]/g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num * 100);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Tempo relativo curto em pt-BR. Aceita ISO completo (ex: criadaEm).
// Ex: "agora", "ha 5min", "ha 2h", "ha 3d", "ha 2sem", "ha 4mes".
export function formatTempoRelativo(iso: string): string {
  const past = new Date(iso).getTime();
  const now = Date.now();
  let diff = Math.max(0, now - past);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  const sem = Math.floor(d / 7);
  if (sem < 4) return `há ${sem}sem`;
  const mes = Math.floor(d / 30);
  if (mes < 12) return `há ${mes}mes`;
  const anos = Math.floor(d / 365);
  return `há ${anos}a`;
}
