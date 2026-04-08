"use client";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Doc } from "../../../convex/_generated/dataModel";
import { getTituloByNivel } from "@/lib/levelTitles";
import { PersonAvatar } from "@/components/pessoas/PersonAvatar";
import { playSound, SOUNDS } from "@/lib/sounds";

// canvas-confetti importado dinamicamente para evitar erro SSR
let confetti: ((opts: object) => void) | null = null;
if (typeof window !== "undefined") {
  import("canvas-confetti").then((m) => { confetti = m.default; });
}

interface Props {
  pessoa: Doc<"pessoas">;
  nivelAnterior: number;
  nivelNovo: number;
  onClose: () => void;
}

export function LevelUpModal({ pessoa, nivelAnterior, nivelNovo, onClose }: Props) {
  const tituloNovo = getTituloByNivel(nivelNovo);
  const tituloAnterior = getTituloByNivel(nivelAnterior);
  const mudouTitulo = tituloNovo.titulo !== tituloAnterior.titulo;
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    playSound(SOUNDS.levelUp, 0.8);

    // Confetti
    setTimeout(() => {
      confetti?.({
        particleCount: 200,
        spread: 180,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FFA500", "#FF6347", "#FBBF24", "#F59E0B"],
      });
    }, 100);

    // Auto-fechar após 5s
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Fundo escuro */}
        <motion.div
          className="absolute inset-0 bg-black/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 flex flex-col items-center gap-6 px-8 py-10 text-center max-w-sm w-full"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Texto LEVEL UP */}
          <motion.div
            className="font-display font-extrabold text-5xl text-transparent bg-clip-text"
            style={{ backgroundImage: "linear-gradient(135deg, #FFD700, #FFA500, #FF6347)" }}
            animate={{
              textShadow: [
                "0 0 20px rgba(255,215,0,0.8)",
                "0 0 60px rgba(255,215,0,1)",
                "0 0 20px rgba(255,215,0,0.8)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            LEVEL UP!
          </motion.div>

          {/* Avatar com borda dourada pulsante */}
          <motion.div
            className="relative"
            animate={{
              boxShadow: [
                "0 0 20px rgba(255,215,0,0.6)",
                "0 0 60px rgba(255,215,0,1)",
                "0 0 20px rgba(255,215,0,0.6)",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{ borderRadius: "50%" }}
          >
            <PersonAvatar pessoa={pessoa} size={96} />
          </motion.div>

          {/* Nome */}
          <div className="text-white font-display font-bold text-xl">
            {pessoa.apelido ?? pessoa.nome}
          </div>

          {/* Transição de nível */}
          <div className="flex items-center gap-4 text-white/80">
            <div className="text-center">
              <div className="font-gamer font-bold text-3xl text-white/50">{nivelAnterior}</div>
              <div className="text-xs text-white/50">Nível anterior</div>
            </div>
            <motion.div
              className="text-3xl"
              animate={{ x: [0, 8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              →
            </motion.div>
            <div className="text-center">
              <motion.div
                className="font-gamer font-bold text-4xl"
                style={{ color: tituloNovo.corClasse }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, delay: 0.3 }}
              >
                {nivelNovo}
              </motion.div>
              <div className="text-xs text-white/70">Nível novo</div>
            </div>
          </div>

          {/* Novo título (se mudou) */}
          {mudouTitulo && (
            <motion.div
              className="rounded-full px-5 py-2 font-display font-bold text-lg"
              style={{
                background: `${tituloNovo.corClasse}30`,
                color: tituloNovo.corClasse,
                border: `2px solid ${tituloNovo.corClasse}`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
            >
              ✨ {tituloNovo.titulo}
            </motion.div>
          )}

          <motion.button
            className="mt-2 text-white/50 text-sm hover:text-white transition-colors underline underline-offset-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={onClose}
          >
            Continuar
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
