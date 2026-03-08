"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/i18n";
import { apiFetch } from "@/modules/shared/api";

const MAX_LEN = 1000;

export default function SuggestionsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [locale, setLocale] = useState("es");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const remaining = MAX_LEN - text.length;
  const counterLabel = useMemo(() => {
    if (remaining < 0) return t("suggestions.counterExceeded");
    if (remaining < 80) return t("suggestions.counterNear");
    return t("suggestions.counterAvailable");
  }, [remaining, t]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (text.trim().length < 3) {
      setStatus("error");
      setMessage(t("suggestions.validationDetail"));
      return;
    }
    if (text.length > MAX_LEN) {
      setStatus("error");
      setMessage(t("suggestions.validationLimit"));
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
      setMessage(t("suggestions.sentMessage"));
      setText("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : t("suggestions.genericError"));
    }
  }

  const stateTone = status === "success" ? "success" : status === "error" ? "error" : status === "sending" ? "loading" : "idle";

  return (
    <main className="shell cycle4-page suggestions-page" id="main-content">
      <div className="page-header">
        <button className="btn-ghost" type="button" onClick={() => router.push("/dashboard")}>
          {t("admin.back")}
        </button>
        <div className="page-title">
          <h1>{t("suggestions.title")}</h1>
          <p>{t("suggestions.subtitle")}</p>
        </div>
      </div>
      <section className="panel panel-soft stack">
        <div>
          <h2 className="panel-title">{t("suggestions.sectionTitle")}</h2>
          <p className="panel-subtitle">{t("suggestions.sectionSubtitle")}</p>
        </div>
        <form className="suggestion-form" onSubmit={onSubmit}>
          <label className="field">
            {t("suggestions.localeLabel")}
            <select name="locale" autoComplete="language" value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="field">
            {t("suggestions.suggestionLabel")}
            <textarea
              name="suggestion"
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={t("suggestions.placeholder")}
            />
            <div className="char-counter">
              <span className={`counter-chip ${remaining < 0 ? "danger" : remaining < 80 ? "warn" : ""}`}>
                {counterLabel}
              </span>
              <span>{text.length}/{MAX_LEN}</span>
            </div>
          </label>
          <div className="row-actions suggestions-actions">
            <button className="btn-primary" type="submit" disabled={status === "sending"}>
              {status === "sending" ? t("suggestions.sending") : t("suggestions.send")}
            </button>
            <Link href="/soporte/feedback?type=bug" className="btn-ghost btn-compact">
              {t("suggestions.reportIssue")}
            </Link>
            <span className="panel-note">{t("suggestions.moderationNote")}</span>
            <span className={`state-pill state-${stateTone}`} aria-live="polite">
              {status === "sending" ? t("suggestions.sending") : status === "success" ? t("suggestions.sentTitle") : status === "error" ? t("suggestions.notSentTitle") : t("suggestions.counterAvailable")}
            </span>
          </div>
        </form>
      </section>

      {message ? (
        <div className={`toast ${status === "success" ? "notice-success" : "notice-error"}`} role="status" aria-live="polite">
          <strong>{status === "success" ? t("suggestions.sentTitle") : t("suggestions.notSentTitle")}</strong>
          <span>{message}</span>
        </div>
      ) : null}
    </main>
  );
}
