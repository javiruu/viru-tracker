export async function reportClientError(section: string, error: Error): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const token = window.localStorage.getItem("viru_token");
    if (!token) return;
    await fetch("/api/v1/ux/errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        section,
        message: error.message || "unknown_error",
        stack: error.stack || null,
      }),
      keepalive: true,
    });
  } catch {
    // no-op
  }
}
