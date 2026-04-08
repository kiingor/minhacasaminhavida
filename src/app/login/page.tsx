"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, Eye, EyeOff } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "login" | "register";

export default function LoginPage() {
  const { setSession } = useSession();
  const loginMutation = useMutation(api.auth.login);
  const registerMutation = useMutation(api.auth.register);
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [entrarFamilia, setEntrarFamilia] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let result: { token: string; familyId: string; name: string; role: "admin" | "member" };
      if (mode === "login") {
        result = await loginMutation({ email, password });
      } else {
        result = await registerMutation({
          name,
          email,
          password,
          familyName: entrarFamilia ? undefined : familyName || `Família de ${name}`,
          familyCode: entrarFamilia ? familyCode.toUpperCase() : undefined,
        });
      }
      setSession({ token: result.token, name: result.name, familyId: result.familyId, role: result.role });
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("senha") || msg.toLowerCase().includes("email")) {
        setError(msg);
      } else if (msg.includes("já cadastrado")) {
        setError("Email já cadastrado. Faça login.");
      } else {
        setError(msg || "Erro ao autenticar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4F46E5] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <Home size={32} className="text-white" />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-white">Minha Casa</h1>
          <p className="text-white/60 text-sm mt-1">Minha Vida — Gestão familiar gamificada</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl space-y-4">
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? "bg-white shadow text-slate-900" : "text-slate-500"}`}
              >
                {m === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <Input label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: João Silva" />
            )}

            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-2">
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEntrarFamilia(false)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${!entrarFamilia ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500"}`}
                  >
                    Criar nova família
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntrarFamilia(true)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${entrarFamilia ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-500"}`}
                  >
                    Entrar com código
                  </button>
                </div>

                {!entrarFamilia ? (
                  <Input label="Nome da família" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Ex: Família Silva" />
                ) : (
                  <Input
                    label="Código da família"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                    placeholder="Ex: AB12CD34"
                    required
                  />
                )}
              </div>
            )}

            {error && (
              <motion.p
                className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === "login" ? "Entrando..." : "Cadastrando..."}
                </span>
              ) : (
                mode === "login" ? "Entrar" : "Criar conta"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
