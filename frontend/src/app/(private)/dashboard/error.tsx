"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/errorLogging";
import { ErrorFallback } from "@/modules/shared/ErrorFallback";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    void reportClientError("dashboard", error);
  }, [error]);

  return <ErrorFallback onRetry={reset} />;
}
