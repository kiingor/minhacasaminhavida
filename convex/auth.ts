import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

// Query interna para validar sessão a partir de Actions
export const getUserByToken = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    if (!sessionToken) return null;
    const now = new Date().toISOString();
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", sessionToken))
      .unique();
    if (!session || session.expiresAt < now) return null;
    const user = await ctx.db.get(session.userId);
    return user;
  },
});

// Hash simples com SHA-256 (sem bcrypt para manter compatibilidade com Convex runtime)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function expiresAt30Dias(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

// ========== REGISTRO ==========
export const register = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    familyName: v.optional(v.string()),
    familyCode: v.optional(v.string()), // entrar em família existente
    // Marco 3.E: registro de consultor (sem familia propria).
    asConsultor: v.optional(v.boolean()),
  },
  handler: async (ctx, { name, email, password, familyName, familyCode, asConsultor }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .unique();
    if (existing) throw new Error("Email já cadastrado");

    let familyId: string;
    let role: "admin" | "member" | "consultor" = "member";

    if (asConsultor) {
      // Consultor: nao tem familia propria. Cria um workspace virtual unico
      // pra simplificar o modelo (todas as queries continuam usando familyId).
      familyId = `CONS-${generateToken().slice(0, 12).toUpperCase()}`;
      role = "consultor";
    } else if (familyCode) {
      // Entrar em família existente
      const familia = await ctx.db
        .query("familias")
        .withIndex("by_familyId", (q) => q.eq("familyId", familyCode.toUpperCase()))
        .unique();
      if (!familia) throw new Error("Código de família inválido");
      familyId = familia.familyId;
    } else {
      // Criar nova família
      familyId = generateToken().slice(0, 8).toUpperCase();
      role = "admin";
      await ctx.db.insert("familias", {
        nome: familyName ?? `Família de ${name}`,
        familyId,
        conviteCode: familyId,
        criadoEm: new Date().toISOString(),
      });
    }

    const passwordHash = await hashPassword(password);
    const userId = await ctx.db.insert("users", {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      familyId,
    });

    const token = generateToken();
    await ctx.db.insert("sessions", {
      userId,
      familyId,
      token,
      expiresAt: expiresAt30Dias(),
    });

    return { token, familyId, name, role };
  },
});

// ========== LOGIN ==========
export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
      .unique();
    if (!user) throw new Error("Email ou senha incorretos");

    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) throw new Error("Email ou senha incorretos");

    const token = generateToken();
    await ctx.db.insert("sessions", {
      userId: user._id,
      familyId: user.familyId,
      token,
      expiresAt: expiresAt30Dias(),
    });

    return {
      token,
      familyId: user.familyId,
      name: user.name,
      role: user.role,
    };
  },
});

// ========== LOGOUT ==========
export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// ========== QUEM SOU EU ==========
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const now = new Date().toISOString();
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < now) return null;
    return await ctx.db.get(session.userId);
  },
});

// ========== CÓDIGO DE CONVITE ==========
export const meuConvite = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session) return null;
    return await ctx.db
      .query("familias")
      .withIndex("by_familyId", (q) => q.eq("familyId", session.familyId))
      .unique();
  },
});
