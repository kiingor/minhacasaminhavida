"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ComentarioCard } from "@/components/consultor/ComentarioCard";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function ComentariosAbertosPage() {
  const token = useSessionToken();
  const comentarios = useQuery(
    api.consultor.meusComentariosPendentes,
    token ? { sessionToken: token } : "skip"
  );

  // Agrupa por familia
  const porFamilia = new Map<string, typeof comentarios extends undefined ? never : NonNullable<typeof comentarios>>();
  if (comentarios) {
    for (const c of comentarios) {
      const arr = porFamilia.get(c.familyId) ?? [];
      arr.push(c);
      porFamilia.set(c.familyId, arr);
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <Link href="/consultor" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} /> Voltar
        </Link>
        <h1 className="font-display text-3xl font-extrabold mt-2 flex items-center gap-2">
          <MessageCircle className="text-blue-500" size={28} /> Comentários abertos
        </h1>
        <p className="text-slate-500">Caixa de entrada de tudo que você ainda não resolveu.</p>
      </motion.div>

      {comentarios === undefined ? (
        <Skeleton className="h-32" />
      ) : comentarios.length === 0 ? (
        <motion.div
          variants={item}
          className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center"
        >
          <p className="text-emerald-800 font-medium">Tudo em dia!</p>
          <p className="text-sm text-emerald-700 mt-1">Nenhum comentário aberto no momento.</p>
        </motion.div>
      ) : (
        Array.from(porFamilia.entries()).map(([fid, list]) => {
          const nome = list[0]?.nomeFamilia ?? "Familia";
          return (
            <motion.section variants={item} key={fid} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display font-bold text-lg">{nome}</h2>
                <Link
                  href={`/consultor/${fid}`}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Abrir cliente →
                </Link>
              </div>
              <div className="space-y-2">
                {list.map((c) => (
                  <ComentarioCard key={c._id} comentario={c} showContexto />
                ))}
              </div>
            </motion.section>
          );
        })
      )}
    </motion.div>
  );
}
