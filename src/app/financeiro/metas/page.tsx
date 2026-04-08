"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetaCard } from "@/components/financeiro/MetaCard";
import { MetaForm } from "@/components/financeiro/MetaForm";

export default function MetasPage() {
  const token = useSessionToken();
  const [showForm, setShowForm] = useState(false);
  const metas = useQuery(api.financeiro.metas.list, token ? { sessionToken: token } : "skip");
  const ativas = metas?.filter((m) => m.ativa) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/financeiro" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1">
            <ChevronLeft size={14} /> Finanças
          </Link>
          <h1 className="font-display text-3xl font-extrabold">Metas</h1>
          <p className="text-slate-500">Objetivos financeiros da família</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova Meta</Button>
      </div>

      {metas === undefined ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : ativas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">Nenhuma meta cadastrada.</p>
          <p className="text-sm">Crie uma meta para começar a economizar!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ativas.map((m) => <MetaCard key={m._id} meta={m} />)}
        </div>
      )}

      {showForm && <MetaForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
