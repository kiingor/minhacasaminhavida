"use client";
import { useState } from "react";
import { FinanceiroDashboard } from "@/components/financeiro/FinanceiroDashboard";
import { currentMonth } from "@/lib/monthUtils";

export default function FinanceiroPage() {
  const [mes, setMes] = useState(currentMonth());
  return (
    <div className="py-6 md:py-10">
      <FinanceiroDashboard mes={mes} onMesChange={setMes} />
    </div>
  );
}
