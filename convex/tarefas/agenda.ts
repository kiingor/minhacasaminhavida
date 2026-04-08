import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { getCurrentUser } from "../_helpers";

// Persiste múltiplos horários agendados de uma vez (usado pelo algoritmo do frontend)
export const salvarAgenda = mutation({
  args: {
    sessionToken: v.string(),
    lancamentos: v.array(
      v.object({
        id: v.id("tarefasLancamentos"),
        horarioAgendado: v.optional(v.object({ inicio: v.string(), fim: v.string() })),
      })
    ),
  },
  handler: async (ctx, { sessionToken, lancamentos }) => {
    const user = await getCurrentUser(ctx, sessionToken);
    for (const l of lancamentos) {
      const doc = await ctx.db.get(l.id);
      if (!doc || doc.familyId !== user.familyId) continue;
      await ctx.db.patch(l.id, { horarioAgendado: l.horarioAgendado });
    }
  },
});
