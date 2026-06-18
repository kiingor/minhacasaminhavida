"use client";
import { useEffect } from "react";

// Error boundary RAIZ — captura erros no root layout/providers (acima do error.tsx).
// Substitui todo o documento, então usa estilos inline (sem depender do CSS do app).
// É a rede de segurança final contra a tela branca em produção.
const STORAGE_KEY = "mcmv_session";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = error?.message ?? "";
    if (/sess[aã]o expirada|n[aã]o autenticad|usu[aá]rio n[aã]o encontrad/i.test(msg)) {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      window.location.href = "/login";
    }
  }, [error]);

  function irParaLogin() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    window.location.href = "/login";
  }

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FBF7F0",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "24px", maxWidth: "360px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "9999px",
              background: "#FAECE7",
              color: "#993C1D",
              fontSize: "26px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: "14px", color: "#6b6b6b", margin: "0 0 20px", lineHeight: 1.5 }}>
            Tivemos um problema ao carregar o app. Tente recarregar ou refazer o login.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                height: "44px",
                padding: "0 20px",
                borderRadius: "9999px",
                background: "#1a1a1a",
                color: "#fff",
                border: "none",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Recarregar
            </button>
            <button
              onClick={irParaLogin}
              style={{
                height: "44px",
                padding: "0 20px",
                borderRadius: "9999px",
                background: "#fff",
                color: "#1a1a1a",
                border: "1px solid #e5e0d5",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Refazer login
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
