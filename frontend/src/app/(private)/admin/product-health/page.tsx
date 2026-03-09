"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/modules/shared/api";
import { useAuthContext } from "@/modules/shared/auth";

type ProductHealth = {
  usage: Record<string, { daily: number; weekly: number; trend: string }>;
  indicators: {
    search_empty_rate_pct: number;
    watchlist_refresh_to_action_pct: number;
    alert_create_rate_pct: number;
  };
  performance: {
    quick_search_avg_ms: number;
    dashboard_avg_ms: number;
    watchlist_refresh_avg_ms: number;
  };
  errors: {
    recent: Array<{ section: string; message: string; created_at: string }>;
    frequent: Array<{ message: string; count: number; last_seen: string | null }>;
    last_occurrence: string | null;
  };
  system: {
    status: "ok" | "degraded" | "critical";
    last_data_update: string | null;
    last_alert_execution: string | null;
  };
};

function statusLabel(status: ProductHealth["system"]["status"]): string {
  if (status === "ok") return "Verde · Normal";
  if (status === "degraded") return "Amarillo · Degradado";
  return "Rojo · Problema";
}

export default function ProductHealthPage() {
  const router = useRouter();
  const { token, ready, isAdmin } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ProductHealth | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace("/login?next=/admin/product-health");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }

    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const payload = await apiFetch<ProductHealth>("/admin/product-health");
        if (active) setData(payload);
      } catch {
        if (active) setError("No se pudo cargar Product Health.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [ready, token, isAdmin, router]);

  if (!ready || loading) {
    return <main className="shell"><div className="notice notice-info">Cargando Product Health...</div></main>;
  }

  return (
    <main className="shell section-gap-lg">
      <section className="page-header">
        <div>
          <h1>Product Health</h1>
          <p className="panel-note">Observabilidad de uso, errores y rendimiento (solo admin).</p>
        </div>
        <Link href="/admin" className="btn-ghost">Volver a Admin</Link>
      </section>

      {error ? <div className="notice notice-error">{error}</div> : null}

      {data ? (
        <>
          <section className="panel panel-soft section-gap">
            <div className="panel-header">
              <h2 className="panel-title">Estado del sistema</h2>
              <span className={`status-pill ${data.system.status === "ok" ? "success" : data.system.status === "degraded" ? "warning" : "error"}`}>
                {statusLabel(data.system.status)}
              </span>
            </div>
            <p className="panel-note">Última actualización de datos: {data.system.last_data_update ?? "sin datos"}</p>
            <p className="panel-note">Última ejecución de alertas: {data.system.last_alert_execution ?? "sin datos"}</p>
          </section>

          <section className="section-gap">
            <div className="dashboard-primary-grid">
              <article className="module-card"><strong>Visitas dashboard</strong><span>{data.usage.dashboard_view?.weekly ?? 0}</span></article>
              <article className="module-card"><strong>Búsquedas rápidas</strong><span>{data.usage.quick_search_executed?.weekly ?? 0}</span></article>
              <article className="module-card"><strong>Refresh watchlist</strong><span>{data.usage.watchlist_refresh?.weekly ?? 0}</span></article>
              <article className="module-card"><strong>Alertas creadas</strong><span>{data.usage.alert_created?.weekly ?? 0}</span></article>
              <article className="module-card"><strong>Alertas disparadas</strong><span>{data.usage.alert_triggered?.weekly ?? 0}</span></article>
              <article className="module-card"><strong>Search empty</strong><span>{data.usage.search_empty_results?.weekly ?? 0}</span></article>
            </div>
          </section>

          <section className="panel section-gap">
            <h2 className="panel-title">Indicadores clave</h2>
            <div className="split section-gap-sm">
              <div className="panel-soft panel">
                <strong>% búsquedas sin resultados</strong>
                <p>{data.indicators.search_empty_rate_pct}%</p>
              </div>
              <div className="panel-soft panel">
                <strong>Ratio refresh → acción</strong>
                <p>{data.indicators.watchlist_refresh_to_action_pct}%</p>
              </div>
              <div className="panel-soft panel">
                <strong>Tasa creación alertas</strong>
                <p>{data.indicators.alert_create_rate_pct}%</p>
              </div>
            </div>
          </section>

          <section className="panel section-gap">
            <h2 className="panel-title">Performance</h2>
            <ul>
              <li>Quick-search medio: {data.performance.quick_search_avg_ms} ms</li>
              <li>Dashboard medio: {data.performance.dashboard_avg_ms} ms</li>
              <li>Refresh watchlist medio: {data.performance.watchlist_refresh_avg_ms} ms</li>
            </ul>
          </section>

          <section className="split section-gap">
            <article className="panel">
              <h2 className="panel-title">Errores recientes</h2>
              {data.errors.recent.length === 0 ? <p className="panel-note">Sin errores recientes.</p> : (
                <ul>
                  {data.errors.recent.map((item, idx) => (
                    <li key={`${item.created_at}-${idx}`}>
                      <strong>{item.section}</strong> · {item.message}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="panel">
              <h2 className="panel-title">Errores frecuentes</h2>
              {data.errors.frequent.length === 0 ? <p className="panel-note">Sin errores frecuentes.</p> : (
                <ul>
                  {data.errors.frequent.map((item, idx) => (
                    <li key={`${item.message}-${idx}`}>
                      <strong>{item.count}x</strong> · {item.message}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}
