export type QuickSearchQueryParams = {
  origin_iata: string | string[];
  destination_iata: string | string[];
  travel_date: string;
  date: string;
  flex_days_before: number;
  flex_days_after: number;
  radius_km: number;
  include_stops: boolean;
  include_nearby_origins: boolean;
  include_nearby_destinations: boolean;
  depart_after?: string;
  depart_before?: string;
  max_stops: number;
  exclude_origins: string[];
  exclude_destinations: string[];
  strict_filters: boolean;
  soft_filters_weight: number;
};

export function toQuickSearchQuery(params: QuickSearchQueryParams): string {
  const query = new URLSearchParams();
  const originValue = Array.isArray(params.origin_iata) ? params.origin_iata.join(",") : params.origin_iata;
  const destinationValue = Array.isArray(params.destination_iata)
    ? params.destination_iata.join(",")
    : params.destination_iata;

  query.set("origin_iata", originValue);
  query.set("destination_iata", destinationValue);
  query.set("travel_date", params.travel_date);
  query.set("date", params.date);
  if (params.flex_days_before > 0) query.set("flex_days_before", String(params.flex_days_before));
  if (params.flex_days_after > 0) query.set("flex_days_after", String(params.flex_days_after));
  query.set("radius_km", String(params.radius_km));
  query.set("include_stops", String(params.include_stops));
  query.set("include_nearby_origins", String(params.include_nearby_origins));
  query.set("include_nearby_destinations", String(params.include_nearby_destinations));
  if (params.depart_after) query.set("depart_after", params.depart_after);
  if (params.depart_before) query.set("depart_before", params.depart_before);
  query.set("max_stops", String(params.max_stops));
  if (params.exclude_origins.length > 0) query.set("exclude_origins", params.exclude_origins.join(","));
  if (params.exclude_destinations.length > 0) query.set("exclude_destinations", params.exclude_destinations.join(","));
  query.set("strict_filters", String(params.strict_filters));
  query.set("soft_filters_weight", String(params.soft_filters_weight));
  return query.toString();
}
