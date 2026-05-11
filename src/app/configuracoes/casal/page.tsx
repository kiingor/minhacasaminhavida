"use client";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ChevronLeft, Heart, UserPlus, Shield, Mail, UserCircle2, Info } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { useSessionToken } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function ConfigCasalPage() {
  const token = useSessionToken();
  const perfis = useQuery(
    api.pessoas.perfilCasal,
    token ? { sessionToken: token } : "skip"
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-2xl"
    >
      <motion.div variants={item}>
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700 mb-1"
        >
          <ChevronLeft size={14} /> Configurações
        </Link>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Heart size={26} className="text-rose-500" />
          Modo Casal
        </h1>
        <p className="text-slate-500 mt-1">
          Perfis de login vinculados ao núcleo familiar.
        </p>
      </motion.div>

      {/* Lista de perfis */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-white border p-5 shadow-sm space-y-3"
      >
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <UserCircle2 size={20} className="text-primary" />
          Perfis vinculados
        </h2>

        {perfis === undefined ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : perfis.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum perfil encontrado.</p>
        ) : (
          <ul className="space-y-2">
            {perfis.map((p) => (
              <li
                key={p.userId}
                className={`rounded-xl border p-3 flex items-center gap-3 ${
                  p.ehAtual
                    ? "border-primary/40 bg-primary/5"
                    : "border-slate-200 bg-white"
                }`}
              >
                {p.pessoaFotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.pessoaFotoUrl}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{
                      background: p.pessoaCorTema ?? "#94A3B8",
                    }}
                    aria-hidden
                  >
                    {(p.pessoaNome ?? p.name).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800">
                      {p.pessoaNome ?? p.name}
                    </span>
                    {p.ehAtual && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-white font-medium">
                        Você
                      </span>
                    )}
                    {p.role === "admin" ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium inline-flex items-center gap-1">
                        <Shield size={9} /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        Membro
                      </span>
                    )}
                    {p.pessoaTipo === "titular" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
                        Titular
                      </span>
                    )}
                    {p.pessoaTipo === "dependente" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">
                        Dependente
                      </span>
                    )}
                    {!p.pessoaId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-medium">
                        Sem perfil de pessoa
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                    <Mail size={11} className="shrink-0" />
                    <span className="truncate">{p.email}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Convidar novo perfil */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-white border p-5 shadow-sm space-y-3"
      >
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <UserPlus size={20} className="text-primary" />
          Convidar novo perfil
        </h2>
        <p className="text-sm text-slate-500">
          Convide o(a) parceiro(a) para acessar o mesmo núcleo familiar com login próprio.
        </p>
        <Button variant="outline" disabled>
          Em breve
        </Button>
        <p className="text-xs text-slate-400">
          Por enquanto, novos perfis devem ser criados via tela de cadastro usando o
          código de família.
        </p>
      </motion.div>

      {/* Sobre permissoes */}
      <motion.div
        variants={item}
        className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-sm space-y-2"
      >
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Info size={16} className="text-slate-500" />
          Sobre as permissões
        </div>
        <p className="text-slate-600">
          Atualmente, todos os perfis vinculados editam tudo. A configuração granular de
          permissões (somente-leitura, escopo por categoria, etc.) está prevista em
          versões futuras.
        </p>
      </motion.div>
    </motion.div>
  );
}
