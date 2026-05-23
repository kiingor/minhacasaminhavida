import Image from "next/image";
import { Doc } from "../../../convex/_generated/dataModel";
import { getTituloByNivel } from "@/lib/levelTitles";
import { cn } from "@/lib/utils";

interface Props {
  pessoa: Pick<Doc<"pessoas">, "fotoUrl" | "nome" | "nivelAtual" | "corTema">;
  size?: number;
  className?: string;
  ring?: boolean;
}

export function PersonAvatar({ pessoa, size = 40, className, ring = true }: Props) {
  const titulo = getTituloByNivel(pessoa.nivelAtual);
  return (
    <div
      className={cn("relative rounded-full shrink-0", className)}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px ${titulo.corClasse}, 0 0 0 4px #FFFFFF` : undefined,
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
          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: pessoa.corTema, fontSize: Math.round(size * 0.4) }}
        >
          {pessoa.nome.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
