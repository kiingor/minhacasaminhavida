// Algoritmo de encaixe de tarefas nas janelas livres do dia.
// Entrada: horário de trabalho da pessoa + lista de tarefas (com tempo).
// Saída: tarefas com horarioAgendado + horário de término + lista de janelas.

export interface HorarioTrabalho {
  diasSemana: number[];
  horaInicio: string;
  horaFim: string;
  cargaHorariaDiaria: number;
  intervalos?: Array<{ inicio: string; fim: string; descricao: string }>;
}

export interface TarefaParaAgendar {
  id: string;
  nome: string;
  tempoExecucaoMinutos: number;
  cor?: string;
}

export interface Janela {
  inicio: string;
  fim: string;
  tipo: "livre" | "trabalho" | "intervalo";
  descricao?: string;
}

export interface TarefaAgendada extends TarefaParaAgendar {
  horarioAgendado: { inicio: string; fim: string };
}

export interface ResultadoAgenda {
  janelas: Janela[];
  agendadas: TarefaAgendada[];
  naoCouberam: TarefaParaAgendar[];
  horarioTermino: string | null;
  tempoTotalMinutos: number;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Retorna dia da semana 0-6 (dom-sáb) de uma data ISO
function getDiaSemana(dataISO: string): number {
  const [y, m, d] = dataISO.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/**
 * Calcula as janelas do dia: livre, trabalho, intervalos.
 * Todas as janelas são retornadas em ordem cronológica, cobrindo o dia das 06:00 às 23:00.
 */
export function calcularJanelas(
  horarioTrabalho: HorarioTrabalho | undefined,
  dataISO: string
): Janela[] {
  const INICIO_DIA = "06:00";
  const FIM_DIA = "23:00";

  // Sem horário configurado → dia todo livre
  if (!horarioTrabalho) {
    return [{ inicio: INICIO_DIA, fim: FIM_DIA, tipo: "livre" }];
  }

  const diaSemana = getDiaSemana(dataISO);
  const isDiaTrabalho = horarioTrabalho.diasSemana.includes(diaSemana);

  if (!isDiaTrabalho) {
    return [{ inicio: INICIO_DIA, fim: FIM_DIA, tipo: "livre" }];
  }

  // Dia de trabalho: bloco livre antes + trabalho (com intervalos) + bloco livre depois
  const janelas: Janela[] = [];

  // Antes do trabalho
  if (timeToMin(horarioTrabalho.horaInicio) > timeToMin(INICIO_DIA)) {
    janelas.push({ inicio: INICIO_DIA, fim: horarioTrabalho.horaInicio, tipo: "livre" });
  }

  // Trabalho + intervalos (intervalos são "livres" dentro do trabalho)
  const intervalos = (horarioTrabalho.intervalos ?? [])
    .slice()
    .sort((a, b) => timeToMin(a.inicio) - timeToMin(b.inicio));

  let cursor = horarioTrabalho.horaInicio;
  for (const int of intervalos) {
    if (timeToMin(int.inicio) > timeToMin(cursor)) {
      janelas.push({ inicio: cursor, fim: int.inicio, tipo: "trabalho" });
    }
    janelas.push({ inicio: int.inicio, fim: int.fim, tipo: "intervalo", descricao: int.descricao });
    cursor = int.fim;
  }
  if (timeToMin(horarioTrabalho.horaFim) > timeToMin(cursor)) {
    janelas.push({ inicio: cursor, fim: horarioTrabalho.horaFim, tipo: "trabalho" });
  }

  // Depois do trabalho
  if (timeToMin(FIM_DIA) > timeToMin(horarioTrabalho.horaFim)) {
    janelas.push({ inicio: horarioTrabalho.horaFim, fim: FIM_DIA, tipo: "livre" });
  }

  return janelas;
}

/**
 * Encaixa as tarefas sequencialmente nas janelas "livres" ou "intervalo".
 * Trabalha na ordem recebida (a UI pode reordenar antes de chamar).
 */
export function calcularAgenda(
  horarioTrabalho: HorarioTrabalho | undefined,
  tarefas: TarefaParaAgendar[],
  dataISO: string
): ResultadoAgenda {
  const janelas = calcularJanelas(horarioTrabalho, dataISO);

  // Janelas aproveitáveis (livres e intervalos)
  const janelasLivres = janelas
    .filter((j) => j.tipo === "livre" || j.tipo === "intervalo")
    .map((j) => ({ inicio: timeToMin(j.inicio), fim: timeToMin(j.fim) }));

  const agendadas: TarefaAgendada[] = [];
  const naoCouberam: TarefaParaAgendar[] = [];

  // Cursor: qual janela estamos e em que minuto
  let janelaIdx = 0;
  let cursor = janelasLivres[0]?.inicio ?? 0;

  for (const tarefa of tarefas) {
    let encaixou = false;

    while (janelaIdx < janelasLivres.length) {
      const janela = janelasLivres[janelaIdx];
      const inicioTentativa = Math.max(cursor, janela.inicio);
      const fimTentativa = inicioTentativa + tarefa.tempoExecucaoMinutos;

      if (fimTentativa <= janela.fim) {
        agendadas.push({
          ...tarefa,
          horarioAgendado: { inicio: minToTime(inicioTentativa), fim: minToTime(fimTentativa) },
        });
        cursor = fimTentativa;
        encaixou = true;
        break;
      } else {
        // Pula para próxima janela
        janelaIdx++;
        if (janelaIdx < janelasLivres.length) {
          cursor = janelasLivres[janelaIdx].inicio;
        }
      }
    }

    if (!encaixou) naoCouberam.push(tarefa);
  }

  const tempoTotalMinutos = tarefas.reduce((s, t) => s + t.tempoExecucaoMinutos, 0);
  const horarioTermino = agendadas.length > 0
    ? agendadas[agendadas.length - 1].horarioAgendado.fim
    : null;

  return { janelas, agendadas, naoCouberam, horarioTermino, tempoTotalMinutos };
}

export { timeToMin, minToTime };
