"use client";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { PersonCard } from "@/components/pessoas/PersonCard";
import { NewPersonButton } from "@/components/pessoas/NewPersonButton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PessoasPage() {
  const token = useSessionToken();
  const pessoas = useQuery(api.pessoas.list, token ? { sessionToken: token } : "skip");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Pessoas</h1>
          <p className="text-slate-500">Membros da família</p>
        </div>
        <NewPersonButton />
      </div>

      {pessoas === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : pessoas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">Nenhuma pessoa cadastrada.</p>
          <p className="text-sm">Clique em "Nova Pessoa" para começar.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pessoas.map((p) => (
            <PersonCard key={p._id} pessoa={p} />
          ))}
        </div>
      )}
    </div>
  );
}
