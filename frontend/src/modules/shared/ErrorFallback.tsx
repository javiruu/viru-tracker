"use client";

type Props = {
  onRetry: () => void;
};

export function ErrorFallback({ onRetry }: Props) {
  return (
    <section className="notice notice-error section-gap" role="alert" aria-live="assertive">
      <div>
        <strong>Algo falló al cargar esta sección.</strong>
        <p>Puedes intentar recargar.</p>
      </div>
      <div className="notice-actions">
        <button type="button" className="btn-secondary btn-compact" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </section>
  );
}
