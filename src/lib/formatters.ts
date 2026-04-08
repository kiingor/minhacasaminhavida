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
