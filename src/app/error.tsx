"use client";
import { useEffect } from "react";

// Error boundary de página (App Router). Captura erros de render/queries no
// segmento e evita a tela branca. Se for erro de sessão, limpa o token e manda
// pro login; caso contrário, oferece "tentar de novo" / "recarregar".
const STORAGE_KEY = "mcmv_session";

function ehErroDeSessao(msg: string): boolean {
  return /sess[aã]o expirada|n[aã]o autenticad|usu[aá]rio n[aã]o encontrad/i.test(msg);
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const sessao = ehErroDeSessao(error?.message ?? "");

  useEffect(() => {
    if (sessao) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      window.location.href = "/login";
    }
  }, [sessao]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="w-14 h-14 rounded-full bg-coral-100 flex items-center justify-center text-coral-600 text-2xl font-bold">
        !
      </div>
      {sessao ? (
        <>
          <h1 className="font-display font-bold text-xl text-ink-900">Sessão expirada</h1>
          <p className="text-sm text-ink-500">Redirecionando para o login…</p>
        </>
      ) : (
        <>
          <h1 className="font-display font-bold text-xl text-ink-900">Algo deu errado</h1>
          <p className="text-sm text-ink-500 max-w-sm">
            Tivemos um problema ao carregar esta tela. Tente novamente.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => reset()}
              className="h-11 px-5 rounded-full bg-ink-900 text-white text-sm font-medium hover:bg-ink-800 transition-colors"
            >
              Tentar de novo
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-11 px-5 rounded-full border border-cream-300 bg-white text-ink-800 text-sm font-medium hover:bg-cream-50 transition-colors"
            >
              Recarregar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
