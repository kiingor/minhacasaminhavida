"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Logo } from "@/components/ui/logo";

type Mode = "login" | "register";
type RegisterTipo = "familia_nova" | "familia_existente" | "consultor";

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
  const [registerTipo, setRegisterTipo] = useState<RegisterTipo>("familia_nova");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let result: { token: string; familyId: string; name: string; role: "admin" | "member" | "consultor" };
      if (mode === "login") {
        result = await loginMutation({ email, password });
      } else {
        result = await registerMutation({
          name,
          email,
          password,
          familyName: registerTipo === "familia_nova" ? familyName || `Família de ${name}` : undefined,
          familyCode: registerTipo === "familia_existente" ? familyCode.toUpperCase() : undefined,
          asConsultor: registerTipo === "consultor",
        });
      }
      setSession({ token: result.token, name: result.name, familyId: result.familyId, role: result.role });
      router.push(result.role === "consultor" ? "/consultor" : "/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("senha") || msg.toLowerCase().includes("email")) setError(msg);
      else if (msg.includes("já cadastrado")) setError("Email já cadastrado. Faça login.");
      else setError(msg || "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-coral-200 opacity-40 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-cream-300 opacity-50 blur-3xl" />

      <motion.div
        className="w-full max-w-md relative"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <div className="text-center mb-8">
          <Logo size={64} className="mx-auto mb-4 shadow-card" />
          <h1 className="font-display font-extrabold text-3xl text-ink-900">Minha Casa</h1>
          <p className="text-ink-500 text-sm mt-1">Minha Vida — Gestão familiar gamificada</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card space-y-5">
          <Segmented<Mode>
            value={mode}
            onChange={(m) => { setMode(m); setError(""); }}
            options={[
              { value: "login",    label: "Entrar" },
              { value: "register", label: "Cadastrar" },
            ]}
            className="w-full"
          />

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <Input label="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: João Silva" />
            )}

            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-ink-500">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="h-12 w-full rounded-2xl border border-cream-200 bg-white px-4 pr-11 text-sm text-ink-900 outline-none placeholder:text-ink-300 focus:border-coral-400 focus:ring-4 focus:ring-coral-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  aria-label={showPass ? "Esconder senha" : "Mostrar senha"}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { v: "familia_nova",      l: "Nova família" },
                    { v: "familia_existente", l: "Com código" },
                    { v: "consultor",         l: "Consultor" },
                  ] as { v: RegisterTipo; l: string }[]).map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRegisterTipo(v)}
                      className={`py-2.5 rounded-full text-[11px] font-semibold transition-colors ${
                        registerTipo === v
                          ? "bg-ink-900 text-white"
                          : "bg-cream-100 text-ink-500 hover:bg-cream-200"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {registerTipo === "familia_nova" && (
                  <Input label="Nome da família" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Ex: Família Silva" />
                )}
                {registerTipo === "familia_existente" && (
                  <Input
                    label="Código da família"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                    placeholder="Ex: AB12CD34"
                    required
                  />
                )}
                {registerTipo === "consultor" && (
                  <p className="text-xs text-ink-500 bg-cream-50 border border-cream-200 rounded-2xl px-4 py-3">
                    Conta de consultor: você poderá acompanhar várias famílias mediante convite delas.
                  </p>
                )}
              </div>
            )}

            {error && (
              <motion.p
                className="text-sm text-ink-900 bg-cream-50 border border-cream-300 rounded-2xl px-4 py-3 font-medium"
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
