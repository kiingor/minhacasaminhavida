import Image from "next/image";
import { User } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";
import { getTituloByNivel } from "@/lib/levelTitles";
import { cn } from "@/lib/utils";

interface Props {
  pessoa: Pick<Doc<"pessoas">, "fotoUrl" | "nome" | "nivelAtual" | "corTema">;
  size?: number;
  className?: string;
}

export function PersonAvatar({ pessoa, size = 40, className }: Props) {
  const titulo = getTituloByNivel(pessoa.nivelAtual);
  return (
    <div
      className={cn("relative rounded-full shrink-0", className)}
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 0 3px ${titulo.corClasse}`,
      }}
    >
      {pessoa.fotoUrl ? (
        <Image
          src={pessoa.fotoUrl}
          alt={pessoa.nome}
          fill
          className="rounded-full object-cover"
          sizes={`${size}px`}
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white text-lg font-bold"
          style={{ background: pessoa.corTema }}
        >
          {pessoa.nome.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
