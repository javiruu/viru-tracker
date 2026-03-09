"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/errorLogging";
import { ErrorFallback } from "@/modules/shared/ErrorFallback";

export default function WatchlistError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    void reportClientError("watchlist", error);
  }, [error]);

  return <ErrorFallback onRetry={reset} />;
}
