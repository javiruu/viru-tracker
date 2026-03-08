export const ROUTE_BRIDGES = {
  "/history": "/watchlist",
  "/preferences": "/preferencias",
  "/preferencias/busqueda": "/preferencias?tab=busqueda",
  "/preferencias/apariencia": "/preferencias?tab=apariencia",
  "/preferencias/region": "/preferencias?tab=region",
} as const;

export type LegacyBridgePath = keyof typeof ROUTE_BRIDGES;

export function resolveBridgeRoute(path: string): string {
  return ROUTE_BRIDGES[path as LegacyBridgePath] || path;
}
