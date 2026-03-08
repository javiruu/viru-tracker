"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/modules/shared/api";

const MAX_LEN = 1000;

export default function SuggestionsPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [locale, setLocale] = useState("es");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const remaining = MAX_LEN - text.length;
  const counterLabel = useMemo(() => {
    if (remaining < 0) return "Excede el maximo";
    if (remaining < 80) return "Limite cercano";
    return "Disponible";
  }, [remaining]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (text.trim().length < 3) {
      setStatus("error");
      setMessage("Describe la sugerencia con mas detalle.");
      return;
    }
    if (text.length > MAX_LEN) {
      setStatus("error");
      setMessage("La sugerencia supera el limite.");
      return;
    }
    try {
      setStatus("sending");
      setMessage("");
      await apiFetch("/suggestions", {
        method: "POST",
        body: JSON.stringify({ text: text.trim(), locale }),
      });
      setStatus("success");
      setMessage("Sugerencia enviada. Gracias por ayudar a mejorar Viru.");
      setText("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo enviar.");
    }
  }

  return (
    <main className="shell" id="main-content">
      <div className="page-header">
        <button className="btn-ghost" type="button" onClick={() => router.push("/dashboard")}>
          Atrás
        </button>
        <div className="page-title">
          <h1>Sugerencias de producto</h1>
          <p>Canal para ideas y mejoras de UX. Para bugs usa “Reportar problema”.</p>
        </div>
      </div>
      <section className="panel panel-soft stack">
        <div>
          <h2 className="panel-title">Feedback y mejoras</h2>
          <p className="panel-subtitle">Cuéntanos rutas, bugs o mejoras de UX.</p>
        </div>
        <form className="suggestion-form" onSubmit={onSubmit}>
          <label className="field">
            Idioma
            <select name="locale" autoComplete="language" value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="field">
            Tu sugerencia
            <textarea
              name="suggestion"
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder="Ejemplo: incluir aviso de precio orientativo en resultados."
            />
            <div className="char-counter">
              <span className={`counter-chip ${remaining < 0 ? "danger" : remaining < 80 ? "warn" : ""}`}>
                {counterLabel}
              </span>
              <span>{text.length}/{MAX_LEN}</span>
            </div>
          </label>
          <div className="row-actions">
            <button className="btn-primary" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Enviando" : "Enviar sugerencia"}
            </button>
            <Link href="/soporte/feedback?type=bug" className="btn-ghost btn-compact">
              Reportar problema
            </Link>
            <span className="panel-note">Moderamos para evitar spam. Tu mensaje queda registrado.</span>
          </div>
        </form>
      </section>

      {message ? (
        <div className={`toast ${status === "success" ? "notice-success" : "notice-error"}`} role="status" aria-live="polite">
          <strong>{status === "success" ? "Enviado" : "No enviado"}</strong>
          <span>{message}</span>
        </div>
      ) : null}
    </main>
  );
}

