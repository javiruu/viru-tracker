"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AirLoader from "@/modules/shared/AirLoader";
import { resolveBridgeRoute } from "@/modules/shared/routeBridges";

export default function PreferencesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(resolveBridgeRoute("/preferences"));
  }, [router]);

  return (
    <main className="shell" id="main-content">
      <section className="panel panel-soft air-loader-section">
        <AirLoader size={0.85} />
        <p className="muted">Redirigiendo preferencias…</p>
      </section>
    </main>
  );
}
