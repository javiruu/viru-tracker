export const DEFAULT_PRIVATE_ROUTE = "/dashboard";
export const LOGIN_ROUTE = "/login";

export function sanitizeReturnUrl(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_PRIVATE_ROUTE;
  const candidate = raw.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_PRIVATE_ROUTE;
  }
  return candidate;
}

export function buildLoginRedirect(returnUrl: string): string {
  const safeReturnUrl = sanitizeReturnUrl(returnUrl);
  return `${LOGIN_ROUTE}?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
}

export function resolvePostAuthUrl(raw: string | null | undefined): string {
  return sanitizeReturnUrl(raw);
}

export function currentPathWithSearch(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PRIVATE_ROUTE;
  }
  const path = window.location.pathname || DEFAULT_PRIVATE_ROUTE;
  const search = window.location.search || "";
  return `${path}${search}`;
}
