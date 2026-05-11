"use client";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { formatBRL, formatDate } from "@/lib/formatters";

interface Props {
  data: { data: string; valor: number }[];
  cor?: string;
  height?: number;
}

interface TooltipPayloadItem {
  payload: { data: string; valor: number };
}

function SparklineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border rounded-lg shadow-md px-2 py-1 text-xs">
      <div className="font-medium">{formatDate(d.data)}</div>
      <div className="font-mono text-slate-700">{formatBRL(d.valor)}</div>
    </div>
  );
}

export function SparklineSaldo({ data, cor = "#8B5CF6", height = 36 }: Props) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-slate-300"
        style={{ height }}
      >
        Sem histórico
      </div>
    );
  }

  // Ponto unico: mostra um indicador estatico
  if (data.length === 1) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
          <Tooltip content={<SparklineTooltip />} cursor={false} />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={cor}
            strokeWidth={1.6}
            dot={false}
            activeDot={{ r: 3, fill: cor }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
