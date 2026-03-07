"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { resolveBridgeRoute } from "@/modules/shared/routeBridges";

export default function HistoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(resolveBridgeRoute("/history"));
  }, [router]);

  return (
    <main className="shell" id="main-content">
      <section className="panel panel-soft stack section-gap" aria-live="polite">
        <h1>Redirigiendo al panel unificado</h1>
        <p>El histórico ahora forma parte de Seguimiento de Vuelos.</p>
      </section>
    </main>
  );
}
