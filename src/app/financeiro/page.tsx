"use client";
import { FinanceiroDashboard } from "@/components/financeiro/FinanceiroDashboard";
import { usePersistedMes } from "@/lib/usePersistedMes";

export default function FinanceiroPage() {
  const [mes, setMes] = usePersistedMes();
  return (
    <div className="py-6 md:py-10">
      <FinanceiroDashboard mes={mes} onMesChange={setMes} />
    </div>
  );
}
