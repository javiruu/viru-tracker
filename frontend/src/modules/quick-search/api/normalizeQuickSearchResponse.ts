import { SearchResult } from "@/modules/quick-search/types";

export function normalizeQuickSearchResults(results: SearchResult[]): SearchResult[] {
  return results.map((item, idx) => ({
    ...item,
    result_id: item.result_id ?? `${item.origin}-${item.destination}-${item.travel_date}-${idx}`,
    price_total: Number.isFinite(item.price_total) ? item.price_total : item.price,
    duration_total_min: item.duration_total_min ?? item.duration_total ?? null,
    stop_count: item.stop_count ?? null,
    risk_label: item.risk_label ?? null,
    minutes_buffer: item.minutes_buffer ?? null,
    distance_km_ground: item.distance_km_ground ?? null,
    ranking_score: item.ranking_score ?? null,
    freshness_ts: item.freshness_ts ?? null,
    stale_data: Boolean(item.stale_data),
    deeplink_url: item.deeplink_url ?? null,
    itinerary_type: item.itinerary_type ?? (item.stop_count && item.stop_count > 0 ? "self_connect" : "direct"),
    legs: item.legs ?? item.segments?.legs ?? [],
  }));
}
