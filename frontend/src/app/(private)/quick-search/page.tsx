"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, apiFetchWithStatus } from "@/modules/shared/api";
import {
  COUNTRY_AIRPORTS,
  CountryAirports,
  findCountryByIata,
  getAirportMeta,
} from "@/modules/shared/airports";
import { getQuickSearchCopy } from "@/modules/shared/quickSearchCopy";
import { trackEvent } from "@/modules/shared/analytics";
import { formatCurrency, formatNumber } from "@/modules/shared/format";
import AirLoader from "@/modules/shared/AirLoader";
import { buildDateRange, getAirportSuggestions } from "@/modules/quick-search/utils";

type SearchResult = {
  result_id?: string | null;
  origin: string;
  destination: string;
  travel_date: string;
  departure_time_local: string | null;
  price: number;
  price_total?: number;
  currency: string;
  source: string;
  duration_total?: number | null;
  duration_total_min?: number | null;
  stop_count?: number | null;
  risk_label?: string | null;
  minutes_buffer?: number | null;
  distance_km_ground?: number | null;
  ranking_score?: number | null;
  freshness_ts?: string | null;
  stale_data?: boolean;
  deeplink_url?: string | null;
  itinerary_type?: string | null;
  legs?: Array<{
    origin_iata: string;
    destination_iata: string;
    dep_ts: string;
    arr_ts: string;
    flight_num?: string | null;
    price?: number | null;
  }>;
  segments?: {
    legs?: Array<{
      origin_iata: string;
      destination_iata: string;
      dep_ts: string;
      arr_ts: string;
      flight_num?: string | null;
      price?: number | null;
    }>;
  };
};

type SearchFilters = {
  applied?: Record<string, unknown>;
  relaxed?: string[];
  warnings?: string[];
  discarded?: number;
};

type SearchResponse = {
  job_id?: string;
  meta?: {
    query?: Record<string, unknown>;
    generated_at?: string;
    currency?: string;
    timezone?: string;
    stale_data?: boolean;
    freshness_ts?: string | null;
    total_candidates?: number;
    returned?: number;
    truncated?: boolean;
    warnings?: Array<{ code: string; message: string }>;
  };
  results: SearchResult[];
  filters?: SearchFilters;
};

type DeepLinkResponse = {
  status: string;
  url: string;
  fallback_url?: string;
  strategy?: string;
};

type WeatherDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  precipProb: number | null;
  description: string;
};

type WeatherReport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  days: WeatherDay[];
};

type Pref = {
  default_radius_km: number;
  include_stops_default: boolean;
  avoid_departure_before: string | null;
  preferred_currency: string;
  language: string;
};

type RegionPref = {
  language: string;
  region: string;
  time_format: string;
  decimal_separator: string;
  currency: string;
};

type QuickSearchField = "origin_iata" | "destination_iata" | "travel_date";
type QuickSearchFieldErrors = Partial<Record<QuickSearchField, string>>;
type QuickSearchAutocompleteField = "origin" | "destination";
type QuickSearchMode = "quick-search" | "recommendations";

const IATA_TO_MAC: Record<string, string> = {
  BRU: "BRL",
};
const EMPTY_SEARCH_VALIDATION_MESSAGE = "Please enter a search";

function QuickSearchView({ mode = "quick-search" }: { mode?: QuickSearchMode }) {
  const router = useRouter();
  const initialOrigin = mode === "recommendations" ? "" : "MAD";
  const initialDestination = mode === "recommendations" ? "" : "DUB";
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState(initialDestination);
  const [travelDate, setTravelDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [isReturn, setIsReturn] = useState(false);
  const [adults, setAdults] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weatherOrigin, setWeatherOrigin] = useState<WeatherReport | null>(null);
  const [weatherDestination, setWeatherDestination] = useState<WeatherReport | null>(null);
  const [weatherMessage, setWeatherMessage] = useState("");
  const [filtersNotice, setFiltersNotice] = useState<string[]>([]);
  const [filtersMeta, setFiltersMeta] = useState<SearchFilters | null>(null);
  const [searchMeta, setSearchMeta] = useState<SearchResponse["meta"] | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "success" | "empty" | "error" | "rate">("idle");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [activePicker, setActivePicker] = useState<"origin" | "destination" | null>(null);
  const [airportSearch, setAirportSearch] = useState("");
  const [recentAirports, setRecentAirports] = useState<string[]>([]);
  const [originCountryOnly, setOriginCountryOnly] = useState<CountryAirports | null>(null);
  const [destinationCountryOnly, setDestinationCountryOnly] = useState<CountryAirports | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [routePulse, setRoutePulse] = useState(false);
  const [departAfter, setDepartAfter] = useState("07:00");
  const [departBefore, setDepartBefore] = useState("22:00");
  const [bufferMin, setBufferMin] = useState("");
  const [includeStops, setIncludeStops] = useState(false);
  const [maxStops, setMaxStops] = useState(1);
  const [radiusKm, setRadiusKm] = useState(150);
  const [includeNearbyOrigins, setIncludeNearbyOrigins] = useState(false);
  const [includeNearbyDestinations, setIncludeNearbyDestinations] = useState(false);
  const [excludeOrigins, setExcludeOrigins] = useState<string[]>([]);
  const [excludeDestinations, setExcludeDestinations] = useState<string[]>([]);
  const [excludeOriginInput, setExcludeOriginInput] = useState("");
  const [excludeDestinationInput, setExcludeDestinationInput] = useState("");
  const [strictFilters, setStrictFilters] = useState(true);
  const [daysBefore, setDaysBefore] = useState(0);
  const [daysAfter, setDaysAfter] = useState(0);
  const [applyFlexReturn, setApplyFlexReturn] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [durationMax, setDurationMax] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [sortBy, setSortBy] = useState<"ranking" | "price" | "duration" | "risk" | "freshness">("ranking");
  const [isDegraded, setIsDegraded] = useState(false);
  const [compactView, setCompactView] = useState(false);
  const [showHighRisk, setShowHighRisk] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [pref, setPref] = useState<Pref | null>(null);
  const [regionPref, setRegionPref] = useState<RegionPref | null>(null);
  const [prefBadge, setPrefBadge] = useState(false);
  const [deepLink, setDeepLink] = useState<DeepLinkResponse | null>(null);
  const [deepLinkError, setDeepLinkError] = useState("");
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyModalPayload, setCopyModalPayload] = useState("");
  const [toast, setToast] = useState<{ message: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const [originTouched, setOriginTouched] = useState(false);
  const [destinationTouched, setDestinationTouched] = useState(false);
  const [dateTouched, setDateTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<QuickSearchFieldErrors>({});
  const [activeAutocompleteField, setActiveAutocompleteField] = useState<QuickSearchAutocompleteField | null>(null);
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState(-1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryAirports | null>(
    findCountryByIata("MAD") || COUNTRY_AIRPORTS[0] || null,
  );
  const [countrySelectionTouched, setCountrySelectionTouched] = useState(false);
  const [airportSelectionTouched, setAirportSelectionTouched] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const autocompleteBlurTimer = useRef<number | null>(null);
  const resultsToolbarRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setRoutePulse(true);
    const timeout = window.setTimeout(() => setRoutePulse(false), 140);
    return () => window.clearTimeout(timeout);
  }, [origin, destination]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("viru_recent_airports");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentAirports(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      setRecentAirports([]);
    }
  }, []);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRateLimitSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimitSeconds]);

  useEffect(() => {
    return () => {
      if (autocompleteBlurTimer.current) {
        window.clearTimeout(autocompleteBlurTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasSearched) return;
    if (!resultsToolbarRef.current) return;
    resultsToolbarRef.current.focus();
  }, [hasSearched]);

  useEffect(() => {
    if (!activePicker && !isFiltersOpen && !copyModalOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closePicker();
      setIsFiltersOpen(false);
      setCopyModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePicker, isFiltersOpen, copyModalOpen, closePicker]);

  const copy = useMemo(
    () => getQuickSearchCopy(regionPref?.language ?? pref?.language),
    [regionPref?.language, pref?.language],
  );
  const { locale, localeTag, t, tWarn } = copy;
  const isRecommendations = mode === "recommendations";
  const pageTitle = isRecommendations ? t("titleRecommendations") : t("title");
  const pageSubtitle = isRecommendations ? t("subtitleRecommendations") : t("subtitle");
  const pageWorkspaceHint = isRecommendations ? t("workspaceHintRecommendations") : t("workspaceHint");
  const formatScore = (value: number) => formatNumber(value, { maximumFractionDigits: 2 }, localeTag);
  const formatMoney = (value: number, currency?: string) => {
    const code = currency ?? searchMeta?.currency ?? "EUR";
    return formatCurrency(value, code, localeTag);
  };

  useEffect(() => {
    apiFetch<Pref>("/preferences/search")
      .then((data) => {
        setPref(data);
        setRadiusKm((prev) => (
          Number.isFinite(data.default_radius_km) ? data.default_radius_km : prev
        ));
        setIncludeStops(Boolean(data.include_stops_default));
        setDepartAfter((prev) => data.avoid_departure_before ?? prev);
        setPrefBadge(true);
      })
      .catch(() => {
        setPref(null);
      });
  }, []);

  useEffect(() => {
    apiFetch<RegionPref>("/preferences/region")
      .then(setRegionPref)
      .catch(() => setRegionPref(null));
  }, []);

  const localRyanairUrl = useMemo(() => {
    if (!travelDate || originCountryOnly || destinationCountryOnly) return "";
    const originMac = IATA_TO_MAC[origin] || "";
    const destinationMac = IATA_TO_MAC[destination] || "";
    const params = new URLSearchParams({
      adults: String(adults),
      teens: "0",
      children: "0",
      infants: "0",
      dateOut: travelDate,
      dateIn: isReturn ? returnDate : "",
      isConnectedFlight: "false",
      discount: "0",
      promoCode: "",
      isReturn: isReturn ? "true" : "false",
      originIata: origin,
      destinationIata: destination,
      originMac,
      destinationMac,
      tpAdults: String(adults),
      tpTeens: "0",
      tpChildren: "0",
      tpInfants: "0",
      tpStartDate: travelDate,
      tpEndDate: isReturn ? returnDate : "",
      tpDiscount: "0",
      tpPromoCode: "",
      tpOriginIata: origin,
      tpDestinationIata: destination,
      tpOriginMac: originMac,
      tpDestinationMac: destinationMac,
    });
    return `https://www.ryanair.com/es/es/trip/flights/select?${params.toString()}`;
  }, [adults, destination, destinationCountryOnly, isReturn, origin, originCountryOnly, returnDate, travelDate]);

  useEffect(() => {
    if (!origin || !destination || !travelDate || originCountryOnly || destinationCountryOnly) {
      setDeepLink(null);
      setDeepLinkError("");
      return;
    }
    if (isReturn && !returnDate) {
      setDeepLink(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("origin_iata", origin);
    params.set("destination_iata", destination);
    params.set("date_out", travelDate);
    if (isReturn && returnDate) {
      params.set("date_in", returnDate);
    }
    params.set("adults", String(adults));
    params.set("teens", "0");
    params.set("children", "0");
    params.set("infants", "0");
    params.set("locale", locale === "en" ? "en-us" : "es-es");
    apiFetch<DeepLinkResponse>(`/search/deeplink?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
    })
      .then((data) => {
        setDeepLink(data);
        setDeepLinkError("");
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setDeepLink(null);
        setDeepLinkError(t("deepLinkError"));
      });
    return () => controller.abort();
  }, [origin, destination, travelDate, returnDate, isReturn, adults, locale, t, originCountryOnly, destinationCountryOnly]);

  function weatherLabel(code: number): string {
    if (code === 0) return t("weatherClear");
    if (code === 1 || code === 2) return t("weatherMostlyClear");
    if (code === 3) return t("weatherCloudy");
    if (code >= 45 && code <= 48) return t("weatherFog");
    if (code >= 51 && code <= 57) return t("weatherDrizzle");
    if (code >= 61 && code <= 67) return t("weatherRain");
    if (code >= 71 && code <= 77) return t("weatherSnow");
    if (code >= 80 && code <= 82) return t("weatherShowers");
    if (code >= 95) return t("weatherStorm");
    return t("weatherVariable");
  }

  async function fetchWeather(iata: string, start: string, end: string): Promise<WeatherReport | null> {
    const meta = getAirportMeta(iata);
    if (!meta) return null;
    const params = new URLSearchParams({
      latitude: String(meta.latitude),
      longitude: String(meta.longitude),
      daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      start_date: start,
      end_date: end,
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) {
      throw new Error("No se pudo cargar clima");
    }
    const data = await res.json();
    const times: string[] = data?.daily?.time || [];
    const maxTemps: number[] = data?.daily?.temperature_2m_max || [];
    const minTemps: number[] = data?.daily?.temperature_2m_min || [];
    const precip: number[] = data?.daily?.precipitation_probability_max || [];
    const codes: number[] = data?.daily?.weathercode || [];
    const days: WeatherDay[] = times.map((time: string, idx: number) => ({
      date: time,
      tempMax: Number(maxTemps[idx] ?? 0),
      tempMin: Number(minTemps[idx] ?? 0),
      precipProb: Number.isFinite(precip[idx]) ? precip[idx] : null,
      description: weatherLabel(Number(codes[idx] ?? 0)),
    }));
    return {
      iata: meta.iata,
      name: meta.name,
      city: meta.city,
      country: meta.country,
      days,
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setMessageType("error");
    setResults([]);
    setHasSearched(false);
    setWeatherMessage("");
    setWeatherOrigin(null);
    setWeatherDestination(null);
    setFiltersNotice([]);
    setFiltersMeta(null);
    setSearchMeta(null);
    setJobId(null);
    setIsDegraded(false);
    setSearchState("loading");
    setSearchError(null);
    setFieldErrors({});
    const originHasValue = Boolean(origin.trim()) || Boolean(originCountryOnly);
    const destinationHasValue = Boolean(destination.trim()) || Boolean(destinationCountryOnly);
    if (!originHasValue && !destinationHasValue) {
      onEmptySearchValidation();
      return;
    }
    if (!travelDate) {
      setSearchState("error");
      setSearchError(t("errorText"));
      setDateTouched(true);
      setFieldErrors({ travel_date: t("selectOutbound") });
      return;
    }
    if (!originValid || !destinationValid) {
      setSearchState("error");
      setSearchError(t("errorText"));
      if (!originValid) setOriginTouched(true);
      if (!destinationValid) setDestinationTouched(true);
      setFieldErrors({
        origin_iata: !originValid ? t("iataInvalid") : undefined,
        destination_iata: !destinationValid ? t("iataInvalid") : undefined,
      });
      return;
    }
    if (isReturn && !returnDate) {
      setSearchState("error");
      setSearchError(t("selectReturn"));
      return;
    }
    if (isReturn && returnDate && returnDate < travelDate) {
      setSearchState("error");
      setSearchError(t("returnBefore"));
      return;
    }
    const nextExcludeOrigins = [...excludeOrigins];
    const nextExcludeDestinations = [...excludeDestinations];
    parseIataList(excludeOriginInput).forEach((value) => {
      if (!nextExcludeOrigins.includes(value)) nextExcludeOrigins.push(value);
    });
    parseIataList(excludeDestinationInput).forEach((value) => {
      if (!nextExcludeDestinations.includes(value)) nextExcludeDestinations.push(value);
    });
    if (excludeOriginInput) setExcludeOriginInput("");
    if (excludeDestinationInput) setExcludeDestinationInput("");
    setExcludeOrigins(nextExcludeOrigins);
    setExcludeDestinations(nextExcludeDestinations);
    const range = buildDateRange(travelDate, isReturn ? returnDate : travelDate);
    const payload = {
      origin_iata: originCountryOnly ? originCountryOnly.airports.map((item) => item.iata) : origin,
      destination_iata: destinationCountryOnly ? destinationCountryOnly.airports.map((item) => item.iata) : destination,
      travel_date: travelDate,
      date: travelDate,
      flex_days_before: daysBefore,
      flex_days_after: daysAfter,
      radius_km: radiusActive ? radiusKm : 0,
      include_stops: includeStops,
      include_nearby_origins: includeNearbyOrigins,
      include_nearby_destinations: includeNearbyDestinations,
      depart_after: departAfter || undefined,
      depart_before: departBefore || undefined,
      max_stops: includeStops ? maxStops : 0,
      exclude_origins: nextExcludeOrigins,
      exclude_destinations: nextExcludeDestinations,
      strict_filters: strictFilters,
      soft_filters_weight: 0.6,
    };
    const query = toQuickSearchQuery(payload);
    try {
      setIsLoading(true);
      const originWeatherIata = originCountryOnly ? "" : origin;
      const destinationWeatherIata = destinationCountryOnly ? "" : destination;
      const [searchResult, originWeather, destinationWeather] = await Promise.allSettled([
        apiFetchWithStatus<SearchResponse>(`/search/quick?${query}`, {
          method: "POST",
        }),
        range.length > 0 && originWeatherIata ? fetchWeather(originWeatherIata, range[0], range[range.length - 1]) : Promise.resolve(null),
        range.length > 0 && destinationWeatherIata ? fetchWeather(destinationWeatherIata, range[0], range[range.length - 1]) : Promise.resolve(null),
      ]);
      if (originWeather.status === "fulfilled") {
        setWeatherOrigin(originWeather.value);
      }
      if (destinationWeather.status === "fulfilled") {
        setWeatherDestination(destinationWeather.value);
      }
      if (originWeather.status === "rejected" || destinationWeather.status === "rejected") {
        setWeatherMessage(t("weatherError"));
      }
      if (searchResult.status === "fulfilled") {
        if (searchResult.value.ok) {
          const data = searchResult.value.data;
          setResults(data.results);
          setFiltersMeta(data.filters || null);
          setSearchMeta(data.meta || null);
          setJobId(data.job_id || null);
          setIsDegraded(Boolean(data.meta?.stale_data || data.results.find((item) => item.stale_data)));
          if (data.filters?.warnings && data.filters.warnings.length > 0) {
            setFiltersNotice(data.filters.warnings.map((item) => tWarn(item)));
          }
          setHasSearched(true);
          setSearchState(data.results.length === 0 ? "empty" : "success");
        } else {
          const { status, error } = searchResult.value;
          const validationErrors = parseValidationErrors(error.details);
          if (Object.keys(validationErrors).length > 0) {
            setFieldErrors(validationErrors);
            if (validationErrors.origin_iata) setOriginTouched(true);
            if (validationErrors.destination_iata) setDestinationTouched(true);
            if (validationErrors.travel_date) setDateTouched(true);
          }
          if (status === 429) {
            setRateLimitSeconds(error.retry_after_sec ?? 30);
            setSearchState("rate");
            setSearchError(error.message || t("rateLimitText"));
          } else {
            setSearchState("error");
            setSearchError(Object.keys(validationErrors).length > 0 ? t("errorText") : (error.message || t("searchFailed")));
          }
          setHasSearched(true);
        }
      } else {
        setSearchState("error");
        setSearchError(searchResult.reason instanceof Error ? searchResult.reason.message : t("searchFailed"));
        setHasSearched(true);
      }
    } catch (error) {
      setSearchState("error");
      setSearchError(error instanceof Error ? error.message : t("searchFailed"));
      setHasSearched(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function addToWatchlist(result: SearchResult) {
    setMessage("");
    try {
      try {
        const response = await apiFetch<{ watch_id?: string; created_or_existing?: string }>("/search/save-result", {
          method: "POST",
          body: JSON.stringify({
            job_id: jobId,
            result_id: result.result_id ?? null,
            origin_iata: result.origin,
            destination_iata: result.destination,
            travel_date: result.travel_date,
            price_total: result.price_total ?? result.price,
            currency: result.currency,
            duration_total: result.duration_total_min ?? result.duration_total ?? null,
            stop_count: result.stop_count ?? null,
            risk_label: result.risk_label ?? null,
            minutes_buffer: result.minutes_buffer ?? null,
            distance_km_ground: result.distance_km_ground ?? null,
            ranking_score: result.ranking_score ?? null,
            freshness_ts: result.freshness_ts ?? null,
            deeplink_url: result.deeplink_url ?? deeplinkUrl ?? null,
            itinerary_type: result.itinerary_type ?? null,
          }),
        });
        if (response.created_or_existing === "existing") {
          setToast({
            message: t("watchExists"),
            actionLabel: t("viewWatchlist"),
            onAction: () => router.push("/watchlist"),
          });
        } else {
          setToast({
            message: t("watchAdded"),
            actionLabel: t("viewWatchlist"),
            onAction: () => router.push("/watchlist"),
          });
        }
      } catch {
        await apiFetch("/watchlist", {
          method: "POST",
          body: JSON.stringify({
            origin_iata: result.origin,
            destination_iata: result.destination,
            travel_date_local: result.travel_date,
          }),
        });
        setToast({
          message: t("watchAdded"),
          actionLabel: t("viewWatchlist"),
          onAction: () => router.push("/watchlist"),
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("watchFailed"));
      setMessageType("error");
    }
  }

  function openPicker(which: "origin" | "destination") {
    const current = which === "origin" ? origin : destination;
    const country = (which === "origin" ? originCountryOnly : destinationCountryOnly)
      || findCountryByIata(current)
      || COUNTRY_AIRPORTS[0]
      || null;
    setSelectedCountry(country);
    setCountrySelectionTouched(false);
    setAirportSelectionTouched(false);
    setAirportSearch("");
    setActivePicker(which);
  }

  function clearSelection() {
    if (activePicker === "origin") {
      setOrigin("");
      setOriginCountryOnly(null);
    }
    if (activePicker === "destination") {
      setDestination("");
      setDestinationCountryOnly(null);
    }
  }

  function selectAirport(iata: string) {
    setAirportSelectionTouched(true);
    if (activePicker === "origin") {
      setOrigin(iata);
      setOriginCountryOnly(null);
    } else if (activePicker === "destination") {
      setDestination(iata);
      setDestinationCountryOnly(null);
    }
    if (typeof window !== "undefined") {
      const next = [iata, ...recentAirports.filter((item) => item !== iata)].slice(0, 6);
      setRecentAirports(next);
      window.localStorage.setItem("viru_recent_airports", JSON.stringify(next));
    }
    setActivePicker(null);
  }

  function selectCountryOnly(country: CountryAirports | null) {
    if (!country) return;
    if (activePicker === "origin") {
      setOrigin("");
      setOriginCountryOnly(country);
    }
    if (activePicker === "destination") {
      setDestination("");
      setDestinationCountryOnly(country);
    }
    setActivePicker(null);
  }

  function closePicker() {
    if (activePicker && countrySelectionTouched && !airportSelectionTouched && selectedCountry) {
      selectCountryOnly(selectedCountry);
      return;
    }
    setActivePicker(null);
  }

  function onFieldFocus() {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setIsEditing(true);
  }

  function onFieldBlur() {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
    }
    blurTimer.current = window.setTimeout(() => setIsEditing(false), 120);
  }

  function clearAutocompleteBlurTimer() {
    if (!autocompleteBlurTimer.current) return;
    window.clearTimeout(autocompleteBlurTimer.current);
    autocompleteBlurTimer.current = null;
  }

  function onAutocompleteFieldFocus(field: QuickSearchAutocompleteField) {
    clearAutocompleteBlurTimer();
    setActiveAutocompleteField(field);
    setActiveAutocompleteIndex(-1);
  }

  function onAutocompleteFieldBlur() {
    clearAutocompleteBlurTimer();
    autocompleteBlurTimer.current = window.setTimeout(() => {
      setActiveAutocompleteField(null);
      setActiveAutocompleteIndex(-1);
    }, 120);
  }

  function onEmptySearchValidation() {
    const detail = `${EMPTY_SEARCH_VALIDATION_MESSAGE}. Search query is required.`;
    setSearchState("error");
    setSearchError(`${detail} / Por favor, introduce una búsqueda.`);
    setOriginTouched(true);
    setDestinationTouched(true);
    setFieldErrors({
      origin_iata: detail,
      destination_iata: detail,
    });
  }

  function selectAutocompleteSuggestion(field: QuickSearchAutocompleteField, iata: string, submitAfterSelect = false) {
    if (field === "origin") {
      setOrigin(iata);
      setOriginCountryOnly(null);
      setOriginTouched(true);
      setFieldErrors((prev) => ({ ...prev, origin_iata: undefined }));
    } else {
      setDestination(iata);
      setDestinationCountryOnly(null);
      setDestinationTouched(true);
      setFieldErrors((prev) => ({ ...prev, destination_iata: undefined }));
    }
    setActiveAutocompleteField(null);
    setActiveAutocompleteIndex(-1);
    if (submitAfterSelect && typeof window !== "undefined") {
      window.requestAnimationFrame(() => formRef.current?.requestSubmit());
    }
  }

  function formatShortDate(value: string): string {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(localeTag, { day: "2-digit", month: "short" });
  }

  function changeAdults(delta: number) {
    setAdults((prev) => Math.min(9, Math.max(1, prev + delta)));
  }

  function applyPreferences() {
    if (!pref) return;
    setRadiusKm(Number.isFinite(pref.default_radius_km) ? pref.default_radius_km : 150);
    setIncludeStops(Boolean(pref.include_stops_default));
    setDepartAfter(pref.avoid_departure_before ?? "07:00");
    setPrefBadge(true);
  }

  const formatRiskLabel = useCallback((label?: string | null) => {
    if (label === "low") return t("riskLow");
    if (label === "medium") return t("riskMedium");
    if (label === "high") return t("riskHigh");
    return label || "";
  }, [t]);

  function parseIataList(raw: string): string[] {
    return raw
      .toUpperCase()
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter((item) => item.length === 3);
  }

  function addChip(
    value: string,
    current: string[],
    setCurrent: (next: string[]) => void,
    setInput: (next: string) => void,
  ) {
    const parsed = parseIataList(value);
    if (parsed.length === 0) {
      setInput(value.toUpperCase());
      return;
    }
    const next = [...current];
    parsed.forEach((iata) => {
      if (!next.includes(iata)) next.push(iata);
    });
    setCurrent(next);
    setInput("");
  }

  function removeChip(
    value: string,
    current: string[],
    setCurrent: (next: string[]) => void,
  ) {
    setCurrent(current.filter((item) => item !== value));
  }

  function formatMinutes(value?: number | null) {
    if (!value && value !== 0) return "--";
    return `${value} min`;
  }

  function formatFreshness(value?: string | null) {
    if (!value) return t("freshnessUnknown");
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return value;
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.round(mins / 60);
    return `${hours} h`;
  }

  function parseValidationErrors(details: unknown): QuickSearchFieldErrors {
    if (!Array.isArray(details)) return {};
    const mapped: QuickSearchFieldErrors = {};
    details.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const record = item as { loc?: unknown; msg?: unknown };
      if (!Array.isArray(record.loc) || typeof record.msg !== "string") return;
      const lastLoc = String(record.loc[record.loc.length - 1] || "");
      if (lastLoc === "origin_iata" || lastLoc === "destination_iata" || lastLoc === "travel_date") {
        mapped[lastLoc] = record.msg;
      }
    });
    return mapped;
  }

  function toQuickSearchQuery(params: {
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
  }): string {
    const query = new URLSearchParams();
    const originValue = Array.isArray(params.origin_iata) ? params.origin_iata.join(",") : params.origin_iata;
    const destinationValue = Array.isArray(params.destination_iata) ? params.destination_iata.join(",") : params.destination_iata;
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

  function resultKey(result: SearchResult, fallback: number) {
    return result.result_id || `${result.origin}-${result.destination}-${result.travel_date}-${fallback}`;
  }

  function trackOpenRyanair() {
    trackEvent("quicksearch_open_ryanair", {
      origin,
      destination,
      travel_date: travelDate,
      is_return: isReturn,
      adults,
      source: "quick_search",
    });
  }

  function flagStyle(code: string): CSSProperties {
    const palette = [
      ["#e2b24a", "#d95d39", "#f6f0e7"],
      ["#4f7fa6", "#f6f0e7", "#2e6e62"],
      ["#d95d39", "#f6f0e7", "#2e6e62"],
      ["#2e6e62", "#f6f0e7", "#d95d39"],
      ["#b97848", "#f6f0e7", "#4f7fa6"],
      ["#c19a3a", "#f6f0e7", "#6c7a89"],
    ];
    const seed = code.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = palette[seed % palette.length];
    return {
      ["--flag-1" as string]: colors[0],
      ["--flag-2" as string]: colors[1],
      ["--flag-3" as string]: colors[2],
    } as CSSProperties;
  }

  const originValid = originCountryOnly ? originCountryOnly.airports.length > 0 : /^[A-Z]{3}$/.test(origin);
  const destinationValid = destinationCountryOnly ? destinationCountryOnly.airports.length > 0 : /^[A-Z]{3}$/.test(destination);
  const originSuggestions = useMemo(() => getAirportSuggestions(origin), [origin]);
  const destinationSuggestions = useMemo(() => getAirportSuggestions(destination), [destination]);
  const activeSuggestions = activeAutocompleteField === "origin"
    ? originSuggestions
    : activeAutocompleteField === "destination"
      ? destinationSuggestions
      : [];
  const activeSuggestionId =
    activeAutocompleteField && activeAutocompleteIndex >= 0 && activeAutocompleteIndex < activeSuggestions.length
      ? `${activeAutocompleteField}-suggestion-${activeSuggestions[activeAutocompleteIndex]?.iata}`
      : undefined;
  const autocompleteLiveText = activeAutocompleteField
    ? activeSuggestions.length > 0
      ? `${activeSuggestions.length} suggestions available`
      : "No suggestions"
    : "";
  const radiusActive = includeNearbyOrigins || includeNearbyDestinations;
  const hasInvalidRoute = !originValid || !destinationValid;
  const isReady =
    originValid &&
    destinationValid &&
    travelDate &&
    (!isReturn || returnDate) &&
    adults > 0 &&
    rateLimitSeconds === 0 &&
    !isLoading;
  const summaryVisible = !isEditing && (origin || destination || originCountryOnly || destinationCountryOnly || travelDate || returnDate);
  const summaryDate = travelDate ? formatShortDate(travelDate) : "--";
  const summaryOriginLabel = originCountryOnly ? originCountryOnly.name : (origin || "---");
  const summaryDestinationLabel = destinationCountryOnly ? destinationCountryOnly.name : (destination || "---");
  const summaryTrip = `${summaryOriginLabel} -> ${summaryDestinationLabel}`;
  const summaryMeta = `${adults} ${adults === 1 ? t("summaryPassengersSingular") : t("summaryPassengersPlural")} - ${
    isReturn ? t("summaryRoundTrip") : t("summaryOneWay")
  } - ${summaryDate}`;
  const summaryFlex =
    daysBefore === 0 && daysAfter === 0 ? t("exactDate") : `${t("flexible")} +/-${daysBefore}/${daysAfter}`;
  const summaryRadius = `${t("summaryRadius")} ${radiusKm} km`;
  const sortLabel = {
    ranking: t("sortRanking"),
    price: t("sortPrice"),
    duration: t("sortDuration"),
    risk: t("sortRisk"),
    freshness: t("sortFreshness"),
  } as const;
  const originCountry = originCountryOnly?.code || findCountryByIata(origin)?.code || "";
  const destinationCountry = destinationCountryOnly?.code || findCountryByIata(destination)?.code || "";
  const deeplinkUrl = deepLink?.url || deepLink?.fallback_url || localRyanairUrl;
  const normalizedResults = useMemo(() => {
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
  }, [results]);
  const { visibleResults, hiddenHighRiskResults } = useMemo(() => {
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    const durMax = durationMax ? Number(durationMax) : null;
    let list = normalizedResults.filter((item) => {
      if (riskFilter !== "all" && item.risk_label !== riskFilter) {
        if (riskFilter !== "high" && item.risk_label === "high") return true;
        return false;
      }
      if (min !== null && item.price_total !== undefined && item.price_total < min) return false;
      if (max !== null && item.price_total !== undefined && item.price_total > max) return false;
      if (durMax !== null && item.duration_total_min !== null && item.duration_total_min > durMax) return false;
      return true;
    });
    const hiddenHighRisk = list.filter((item) => item.risk_label === "high" && riskFilter !== "high");
    if (!showHighRisk && riskFilter !== "high") {
      list = list.filter((item) => item.risk_label !== "high");
    }
    const riskScore = (label?: string | null) => {
      if (label === "low") return 1;
      if (label === "medium") return 2;
      if (label === "high") return 3;
      return 9;
    };
    list = list.slice().sort((a, b) => {
      if (sortBy === "price") {
        return (a.price_total ?? 0) - (b.price_total ?? 0);
      }
      if (sortBy === "duration") {
        return (a.duration_total ?? 99999) - (b.duration_total ?? 99999);
      }
      if (sortBy === "risk") {
        return riskScore(a.risk_label) - riskScore(b.risk_label);
      }
      if (sortBy === "freshness") {
        const aTs = a.freshness_ts ? new Date(a.freshness_ts).getTime() : 0;
        const bTs = b.freshness_ts ? new Date(b.freshness_ts).getTime() : 0;
        return bTs - aTs;
      }
      return (b.ranking_score ?? 0) - (a.ranking_score ?? 0);
    });
    return { visibleResults: list, hiddenHighRiskResults: hiddenHighRisk };
  }, [normalizedResults, priceMin, priceMax, durationMax, riskFilter, sortBy, showHighRisk]);

  const activeChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; onClear: () => void }> = [];
    if (daysBefore > 0 || daysAfter > 0) {
      chips.push({
        id: "flex",
        label: `${t("flexible")} ?${daysBefore}/${daysAfter}`,
        onClear: () => {
          setDaysBefore(0);
          setDaysAfter(0);
        },
      });
    }
    if (radiusActive && radiusKm !== 150) {
      chips.push({
        id: "radius",
        label: `${t("radiusLabel")}: ${radiusKm} km`,
        onClear: () => setRadiusKm(150),
      });
    }
    if (includeNearbyOrigins) {
      chips.push({
        id: "nearby-origins",
        label: t("nearbyOrigins"),
        onClear: () => setIncludeNearbyOrigins(false),
      });
    }
    if (includeNearbyDestinations) {
      chips.push({
        id: "nearby-destinations",
        label: t("nearbyDestinations"),
        onClear: () => setIncludeNearbyDestinations(false),
      });
    }
    if (priceMin) {
      chips.push({
        id: "price-min",
        label: `${t("priceMin")}: ${priceMin}`,
        onClear: () => setPriceMin(""),
      });
    }
    if (priceMax) {
      chips.push({
        id: "price-max",
        label: `${t("priceMax")}: ${priceMax}`,
        onClear: () => setPriceMax(""),
      });
    }
    if (durationMax) {
      chips.push({
        id: "duration-max",
        label: `${t("durationMax")}: ${durationMax}`,
        onClear: () => setDurationMax(""),
      });
    }
    if (!strictFilters) {
      chips.push({
        id: "strict",
        label: t("strictMode"),
        onClear: () => setStrictFilters(true),
      });
    }
    if (includeStops) {
      chips.push({
        id: "stops",
        label: `${t("includeStops")} - ${maxStops}`,
        onClear: () => setIncludeStops(false),
      });
    }
    if (riskFilter !== "all") {
      chips.push({
        id: "risk",
        label: `${t("riskAllowed")}: ${formatRiskLabel(riskFilter)}`,
        onClear: () => setRiskFilter("all"),
      });
    }
    if (excludeOrigins.length > 0) {
      chips.push({
        id: "exclude-origins",
        label: `${t("excludeOrigins")}: ${excludeOrigins.join(", ")}`,
        onClear: () => setExcludeOrigins([]),
      });
    }
    if (excludeDestinations.length > 0) {
      chips.push({
        id: "exclude-destinations",
        label: `${t("excludeDestinations")}: ${excludeDestinations.join(", ")}`,
        onClear: () => setExcludeDestinations([]),
      });
    }
    return chips;
  }, [
    daysBefore,
    daysAfter,
    radiusActive,
    radiusKm,
    includeNearbyOrigins,
    includeNearbyDestinations,
    priceMin,
    priceMax,
    durationMax,
    strictFilters,
    includeStops,
    maxStops,
    riskFilter,
    excludeOrigins,
    excludeDestinations,
    formatRiskLabel,
    t,
  ]);

  const selectedResult = useMemo(() => {
    if (!selectedResultId) return null;
    return (
      visibleResults.find((item, idx) => resultKey(item, idx) === selectedResultId) || null
    );
  }, [visibleResults, selectedResultId]);

  const fallbackPayload = useMemo(() => {
    return JSON.stringify(
      {
        origin_iata: origin,
        destination_iata: destination,
        date: travelDate,
        flex_days_before: daysBefore,
        flex_days_after: daysAfter,
        radius_km: radiusActive ? radiusKm : 0,
        include_nearby_origin: includeNearbyOrigins,
        include_nearby_destination: includeNearbyDestinations,
        price_min: priceMin ? Number(priceMin) : undefined,
        price_max: priceMax ? Number(priceMax) : undefined,
        departure_from: departAfter || undefined,
        departure_to: departBefore || undefined,
        duration_max_min: durationMax ? Number(durationMax) : undefined,
        include_stops: includeStops,
        max_stops: includeStops ? maxStops : 0,
        risk_allowed: riskFilter,
        exclude_origins: excludeOrigins,
        exclude_destinations: excludeDestinations,
        strict_mode: strictFilters,
        trip_type: isReturn ? "round_trip" : "one_way",
        return_date: isReturn ? returnDate : undefined,
        adults,
        flex_apply_return: isReturn ? applyFlexReturn : undefined,
        buffer_min: bufferMin ? Number(bufferMin) : undefined,
      },
      null,
      2,
    );
  }, [
    origin,
    destination,
    travelDate,
    daysBefore,
    daysAfter,
    radiusActive,
    radiusKm,
    includeNearbyOrigins,
    includeNearbyDestinations,
    priceMin,
    priceMax,
    departAfter,
    departBefore,
    durationMax,
    includeStops,
    maxStops,
    riskFilter,
    excludeOrigins,
    excludeDestinations,
    strictFilters,
    isReturn,
    returnDate,
    adults,
    applyFlexReturn,
    bufferMin,
  ]);

  const runSearch = () => {
    void onSubmit({ preventDefault: () => {} } as FormEvent);
  };

  return (
    <main className="shell quick-search-shell" id="main-content">
      <div className="page-header qs-page-header">
        <button className="btn-ghost" type="button" onClick={() => router.push("/dashboard")}>
          {t("back")}
        </button>
        <div className="page-title">
          <h1>{pageTitle}</h1>
          <p>{pageSubtitle}</p>
        </div>
      </div>

      <form
        ref={formRef}
        className={`panel form quick-search-panel ${isReady ? "ready" : ""} ${routePulse ? "route-pulse" : ""}`}
        onSubmit={onSubmit}
        aria-describedby="qs-workspace-hint"
      >
        <div className="qs-route">
          <div className="qs-route-card">
            <label className="qs-label">
              <span>
                {t("originLabel")}
                <span className="qs-tip" data-tip={t("originTip")} tabIndex={0} role="note" aria-label={t("originTip")}>
                  ?
                </span>
              </span>
              <div className="qs-input-wrap">
                <span className="qs-input-prefix" aria-hidden="true">
                  {originCountry ? (
                    <span className="flag-badge" style={flagStyle(originCountry)} />
                  ) : null}
                  <span className="qs-input-icon">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path
                        d="M3 11l18-6-6 18-2.2-7.2L3 11z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <path
                        d="M11 13l7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
                <input
                  className="qs-input"
                  role="combobox"
                  name="origin_iata"
                  autoComplete="off"
                  aria-autocomplete="list"
                  value={origin}
                  onFocus={() => {
                    onFieldFocus();
                    onAutocompleteFieldFocus("origin");
                  }}
                  onBlur={() => {
                    onFieldBlur();
                    setOriginTouched(true);
                    onAutocompleteFieldBlur();
                  }}
                  onChange={(e) => {
                    setOrigin(e.target.value.toUpperCase());
                    setOriginCountryOnly(null);
                    setFieldErrors((prev) => ({ ...prev, origin_iata: undefined }));
                    setActiveAutocompleteField("origin");
                    setActiveAutocompleteIndex(-1);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      if (originSuggestions.length === 0) return;
                      setActiveAutocompleteField("origin");
                      setActiveAutocompleteIndex((prev) => {
                        if (prev < 0) return 0;
                        return (prev + 1) % originSuggestions.length;
                      });
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (originSuggestions.length === 0) return;
                      setActiveAutocompleteField("origin");
                      setActiveAutocompleteIndex((prev) => {
                        if (prev <= 0) return originSuggestions.length - 1;
                        return prev - 1;
                      });
                      return;
                    }
                    if (event.key === "Escape") {
                      setActiveAutocompleteField(null);
                      setActiveAutocompleteIndex(-1);
                      return;
                    }
                    if (event.key === "Enter") {
                      const selected = activeAutocompleteField === "origin" && activeAutocompleteIndex >= 0
                        ? originSuggestions[activeAutocompleteIndex]
                        : null;
                      if (selected) {
                        event.preventDefault();
                        selectAutocompleteSuggestion("origin", selected.iata, true);
                        return;
                      }
                      if (!origin.trim() && !destination.trim() && !originCountryOnly && !destinationCountryOnly) {
                        event.preventDefault();
                        onEmptySearchValidation();
                      }
                    }
                  }}
                  placeholder={originCountryOnly ? originCountryOnly.name : "MAD"}
                  aria-invalid={(originTouched && !originValid) || Boolean(fieldErrors.origin_iata)}
                  aria-describedby="origin-help"
                  aria-expanded={activeAutocompleteField === "origin"}
                  aria-controls="origin-suggestions"
                  aria-activedescendant={activeAutocompleteField === "origin" ? activeSuggestionId : undefined}
                />
                {activeAutocompleteField === "origin" && originSuggestions.length > 0 ? (
                  <ul className="qs-autocomplete" id="origin-suggestions" role="listbox">
                    {originSuggestions.map((suggestion, index) => {
                      const isActive = index === activeAutocompleteIndex;
                      return (
                        <li key={`origin-${suggestion.iata}`} role="option" aria-selected={isActive}>
                          <button
                            id={`origin-suggestion-${suggestion.iata}`}
                            type="button"
                            className={isActive ? "qs-autocomplete-item active" : "qs-autocomplete-item"}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectAutocompleteSuggestion("origin", suggestion.iata)}
                          >
                            <strong>{suggestion.iata}</strong>
                            <span>{suggestion.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              <small id="origin-help">{t("originHelp")} {t("iataHelp")}</small>
              {originCountryOnly ? (
                <div className="qs-country-row">
                  <span className="qs-chip">{t("countryOnlySelected").replace("{country}", originCountryOnly.name)}</span>
                  <button type="button" className="btn-ghost btn-compact" onClick={() => setOriginCountryOnly(null)}>
                    {t("countryOnlyClear")}
                  </button>
                </div>
              ) : null}
              {(originTouched && !originValid) || fieldErrors.origin_iata ? (
                <small className="qs-error">{fieldErrors.origin_iata || t("iataInvalid")}</small>
              ) : null}
            </label>
            <button type="button" className="btn-ghost" onClick={() => openPicker("origin")}>
              {t("pickAirport")}
            </button>
          </div>

          <div className="qs-route-line" aria-hidden="true">
            <span className="qs-route-plane">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path
                  d="M3 13l18-6-6 18-2.2-7.2L3 13z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>

          <div className="qs-route-card">
            <label className="qs-label">
              <span>
                {t("destinationLabel")}
                <span className="qs-tip" data-tip={t("destinationTip")} tabIndex={0} role="note" aria-label={t("destinationTip")}>
                  ?
                </span>
              </span>
              <div className="qs-input-wrap">
                <span className="qs-input-prefix" aria-hidden="true">
                  {destinationCountry ? (
                    <span className="flag-badge" style={flagStyle(destinationCountry)} />
                  ) : null}
                  <span className="qs-input-icon">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path
                        d="M12 21s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="9" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                  </span>
                </span>
                <input
                  className="qs-input"
                  role="combobox"
                  name="destination_iata"
                  autoComplete="off"
                  aria-autocomplete="list"
                  value={destination}
                  onFocus={() => {
                    onFieldFocus();
                    onAutocompleteFieldFocus("destination");
                  }}
                  onBlur={() => {
                    onFieldBlur();
                    setDestinationTouched(true);
                    onAutocompleteFieldBlur();
                  }}
                  onChange={(e) => {
                    setDestination(e.target.value.toUpperCase());
                    setDestinationCountryOnly(null);
                    setFieldErrors((prev) => ({ ...prev, destination_iata: undefined }));
                    setActiveAutocompleteField("destination");
                    setActiveAutocompleteIndex(-1);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      if (destinationSuggestions.length === 0) return;
                      setActiveAutocompleteField("destination");
                      setActiveAutocompleteIndex((prev) => {
                        if (prev < 0) return 0;
                        return (prev + 1) % destinationSuggestions.length;
                      });
                      return;
                    }
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      if (destinationSuggestions.length === 0) return;
                      setActiveAutocompleteField("destination");
                      setActiveAutocompleteIndex((prev) => {
                        if (prev <= 0) return destinationSuggestions.length - 1;
                        return prev - 1;
                      });
                      return;
                    }
                    if (event.key === "Escape") {
                      setActiveAutocompleteField(null);
                      setActiveAutocompleteIndex(-1);
                      return;
                    }
                    if (event.key === "Enter") {
                      const selected = activeAutocompleteField === "destination" && activeAutocompleteIndex >= 0
                        ? destinationSuggestions[activeAutocompleteIndex]
                        : null;
                      if (selected) {
                        event.preventDefault();
                        selectAutocompleteSuggestion("destination", selected.iata, true);
                        return;
                      }
                      if (!origin.trim() && !destination.trim() && !originCountryOnly && !destinationCountryOnly) {
                        event.preventDefault();
                        onEmptySearchValidation();
                      }
                    }
                  }}
                  placeholder={destinationCountryOnly ? destinationCountryOnly.name : "DUB"}
                  aria-invalid={(destinationTouched && !destinationValid) || Boolean(fieldErrors.destination_iata)}
                  aria-describedby="destination-help"
                  aria-expanded={activeAutocompleteField === "destination"}
                  aria-controls="destination-suggestions"
                  aria-activedescendant={activeAutocompleteField === "destination" ? activeSuggestionId : undefined}
                />
                {activeAutocompleteField === "destination" && destinationSuggestions.length > 0 ? (
                  <ul className="qs-autocomplete" id="destination-suggestions" role="listbox">
                    {destinationSuggestions.map((suggestion, index) => {
                      const isActive = index === activeAutocompleteIndex;
                      return (
                        <li key={`destination-${suggestion.iata}`} role="option" aria-selected={isActive}>
                          <button
                            id={`destination-suggestion-${suggestion.iata}`}
                            type="button"
                            className={isActive ? "qs-autocomplete-item active" : "qs-autocomplete-item"}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectAutocompleteSuggestion("destination", suggestion.iata)}
                          >
                            <strong>{suggestion.iata}</strong>
                            <span>{suggestion.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
              <small id="destination-help">{t("destinationHelp")} {t("iataHelp")}</small>
              {destinationCountryOnly ? (
                <div className="qs-country-row">
                  <span className="qs-chip">{t("countryOnlySelected").replace("{country}", destinationCountryOnly.name)}</span>
                  <button type="button" className="btn-ghost btn-compact" onClick={() => setDestinationCountryOnly(null)}>
                    {t("countryOnlyClear")}
                  </button>
                </div>
              ) : null}
              {(destinationTouched && !destinationValid) || fieldErrors.destination_iata ? (
                <small className="qs-error">{fieldErrors.destination_iata || t("iataInvalid")}</small>
              ) : null}
            </label>
            <button type="button" className="btn-ghost" onClick={() => openPicker("destination")}>
              {t("pickAirport")}
            </button>
          </div>
        </div>
        <div className="qs-flex-row">
          <div className="qs-flex-control">
            <span className="qs-label-title">{t("flexTitle")}</span>
            <details className="qs-flex-popover">
              <summary>
                {daysBefore === 0 && daysAfter === 0 ? t("exactDate") : `${t("flexible")} +/-${daysBefore}/${daysAfter}`}
              </summary>
              <div className="qs-flex-panel">
                <label className="qs-flex-field">
                  {t("daysBefore")}
                  <input
                    className="qs-input"
                    type="number"
                    name="flex_days_before"
                    autoComplete="off"
                    min={0}
                    max={7}
                    value={daysBefore}
                    onChange={(e) => setDaysBefore(Math.max(0, Number(e.target.value)))}
                  />
                </label>
                <label className="qs-flex-field">
                  {t("daysAfter")}
                  <input
                    className="qs-input"
                    type="number"
                    name="flex_days_after"
                    autoComplete="off"
                    min={0}
                    max={7}
                    value={daysAfter}
                    onChange={(e) => setDaysAfter(Math.max(0, Number(e.target.value)))}
                  />
                </label>
                <span className="qs-flex-helper">{t("flexHelper")}</span>
                {isReturn ? (
                  <label className="qs-check">
                    <input
                      type="checkbox"
                      name="flex_apply_return"
                      checked={applyFlexReturn}
                      onChange={(e) => setApplyFlexReturn(e.target.checked)}
                    />
                    <span className="qs-check-ui" aria-hidden="true">
                      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                        <path
                          d="M5.5 12.5 10 17l8.5-9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {t("flexApplyReturn")}
                  </label>
                ) : null}
              </div>
            </details>
          </div>
        </div>
        <span className="sr-only" aria-live="polite">{autocompleteLiveText}</span>

        <div className="qs-date-grid">
          <label className="date-field qs-label">
            <span>
              {t("dateLabel")}
              <span className="qs-tip" data-tip={t("dateTip")} tabIndex={0} role="note" aria-label={t("dateTip")}>
                ?
              </span>
            </span>
            <div className="qs-input-wrap">
              <span className="qs-input-prefix" aria-hidden="true">
                <span className="qs-input-icon">
                  <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M8 2v4M16 2v4M3 9h18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
              <input
                className="qs-input date-ghost"
                type="date"
                name="travel_date"
                autoComplete="off"
                data-empty={!travelDate}
                value={travelDate}
                onBlur={() => setDateTouched(true)}
                onChange={(e) => {
                  setTravelDate(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, travel_date: undefined }));
                }}
                aria-invalid={(dateTouched && !travelDate) || Boolean(fieldErrors.travel_date)}
              />
            </div>
            {(dateTouched && !travelDate) || fieldErrors.travel_date ? (
              <small className="qs-error">{fieldErrors.travel_date || t("selectOutbound")}</small>
            ) : null}
          </label>

          <label className="qs-check qs-check-inline">
            <input
              type="checkbox"
              name="is_return"
              checked={isReturn}
              onChange={(e) => setIsReturn(e.target.checked)}
            />
            <span className="qs-check-ui" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                <path
                  d="M5.5 12.5 10 17l8.5-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {t("roundTrip")}
          </label>

          {isReturn ? (
            <label className="date-field qs-label">
              <span>{t("returnLabel")}</span>
              <div className="qs-input-wrap">
                <span className="qs-input-prefix" aria-hidden="true">
                  <span className="qs-input-icon">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                      <path
                        d="M8 2v4M16 2v4M3 9h18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
                <input
                  className="qs-input date-ghost"
                  type="date"
                  name="return_date"
                  autoComplete="off"
                  data-empty={!returnDate}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={travelDate || undefined}
                />
              </div>
            </label>
          ) : null}
        </div>

        <div className="qs-passengers">
          <span>{t("passengers")}</span>
          <div className="qs-stepper">
            <button type="button" onClick={() => changeAdults(-1)} disabled={adults <= 1}>
              -
            </button>
            <span className="qs-stepper-value">{adults}</span>
            <button type="button" onClick={() => changeAdults(1)} disabled={adults >= 9}>
              +
            </button>
          </div>
        </div>

        <div className="qs-actions">
          <div className="qs-search-cta">
            <button className="btn-search" type="submit" disabled={!isReady}>
              {isLoading ? t("loadingAria") : t("search")}
            </button>
            {!isReady && hasInvalidRoute ? (
              <small className="qs-search-hint">Introduce Origen y Destino para buscar</small>
            ) : null}
          </div>
          {summaryVisible ? (
            <div className="qs-summary">
              <strong>{summaryTrip}</strong>
              <span>{summaryMeta}</span>
              <span>{summaryFlex}</span>
              <span>{summaryRadius}</span>
            </div>
          ) : null}
          <div className="qs-ready" aria-live="polite">
            <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
              <path
                d="M5.5 12.5 10 17l8.5-9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("ready")}
          </div>
        </div>
      </form>

      <div id="qs-workspace-hint" className="qs-workspace-hint">
        {pageWorkspaceHint}
      </div>
      <div className="qs-workspace">
        <aside className={`panel panel-soft qs-filters-panel ${isFiltersOpen ? "open" : ""}`}>
          <div className="qs-filters-header">
            <div>
              <h2>{t("filtersTitle")}</h2>
              <span className="muted">{t("filtersSubtitle")}</span>
            </div>
            <button type="button" className="btn-ghost qs-filters-close" onClick={() => setIsFiltersOpen(false)}>
              {t("pickClose")}
            </button>
          </div>
          <div className="qs-filters-grid">
            <div className="qs-filter-group qs-filter-core">
              <div className="qs-filter-head">
                <h3>Core</h3>
              </div>
              <div className="qs-filter-grid">
                <label className="field">
                  {t("priceMin")}
                  <input
                    name="price_min"
                    autoComplete="off"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="10"
                    className="qs-input"
                  />
                </label>
                <label className="field">
                  {t("durationMax")}
                  <input
                    name="duration_max"
                    autoComplete="off"
                    value={durationMax}
                    onChange={(e) => setDurationMax(e.target.value)}
                    placeholder="240"
                    className="qs-input"
                  />
                </label>
                <label className="field">
                  {t("priceMax")}
                  <input
                    name="price_max"
                    autoComplete="off"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="120"
                    className="qs-input"
                  />
                </label>
              </div>
            </div>

            <details className="qs-filter-accordion" open>
              <summary className="qs-filter-summary">
                <div className="qs-filter-head">
                  <h3>{t("alternatesTitle")}</h3>
                  {prefBadge ? <span className="badge badge-control">{t("appliedPref")}</span> : null}
                </div>
              </summary>
              <div className="qs-filter-group">
                <div className="qs-filter-grid">
                  <label className="field">
                    {t("radiusLabel")}
                    <div className="qs-range">
                      <input
                        type="range"
                        name="radius_km_range"
                        min={0}
                        max={300}
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Math.max(0, Number(e.target.value)))}
                        disabled={!radiusActive}
                      />
                      <input
                        name="radius_km"
                        autoComplete="off"
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Math.max(0, Number(e.target.value)))}
                        className="qs-input"
                        disabled={!radiusActive}
                      />
                    </div>
                    <small className="muted">{radiusActive ? t("radiusHint") : t("radiusInactive")}</small>
                  </label>
                <label className="qs-check">
                  <input
                    type="checkbox"
                    name="include_nearby_origins"
                    checked={includeNearbyOrigins}
                    onChange={(e) => setIncludeNearbyOrigins(e.target.checked)}
                  />
                  <span className="qs-check-ui" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path
                        d="M5.5 12.5 10 17l8.5-9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {t("nearbyOrigins")}
                </label>
                <label className="qs-check">
                  <input
                    type="checkbox"
                    name="include_nearby_destinations"
                    checked={includeNearbyDestinations}
                    onChange={(e) => setIncludeNearbyDestinations(e.target.checked)}
                  />
                  <span className="qs-check-ui" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path
                        d="M5.5 12.5 10 17l8.5-9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {t("nearbyDestinations")}
                </label>
              </div>
              </div>
            </details>

            <details className="qs-filter-accordion">
              <summary className="qs-filter-summary">
                <div className="qs-filter-head">
                  <h3>{t("timeTitle")}</h3>
                  <span className="muted">{t("timeSubtitle")}</span>
                </div>
              </summary>
              <div className="qs-filter-group">
              <div className="qs-filter-grid">
                <label className="field">
                  {t("departAfter")}
                  <input
                    type="time"
                    name="depart_after"
                    autoComplete="off"
                    value={departAfter}
                    onChange={(e) => setDepartAfter(e.target.value)}
                    className="qs-input"
                  />
                </label>
                <label className="field">
                  {t("departBefore")}
                  <input
                    type="time"
                    name="depart_before"
                    autoComplete="off"
                    value={departBefore}
                    onChange={(e) => setDepartBefore(e.target.value)}
                    className="qs-input"
                  />
                </label>
                <label className="qs-check">
                  <input
                    type="checkbox"
                    name="strict_filters"
                    checked={strictFilters}
                    onChange={(e) => setStrictFilters(e.target.checked)}
                  />
                  <span className="qs-check-ui" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path
                        d="M5.5 12.5 10 17l8.5-9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {t("strictMode")}
                </label>
              </div>
              {!strictFilters ? (
                <div className="qs-warning">
                  {t("strictWarning")}
                </div>
              ) : null}
              </div>
            </details>

            <details className="qs-filter-accordion">
              <summary className="qs-filter-summary">
                <div className="qs-filter-head">
                  <h3>{t("stopsTitle")}</h3>
                  <span className="muted">{t("stopsSubtitle")}</span>
                </div>
              </summary>
              <div className="qs-filter-group">
              <div className="qs-filter-grid">
                <label className="qs-check">
                  <input
                    type="checkbox"
                    name="include_stops"
                    checked={includeStops}
                    onChange={(e) => setIncludeStops(e.target.checked)}
                  />
                  <span className="qs-check-ui" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
                      <path
                        d="M5.5 12.5 10 17l8.5-9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {t("includeStops")}
                </label>
                <label className="field">
                  {t("maxStops")}
                  <select
                    name="max_stops"
                    autoComplete="off"
                    value={maxStops}
                    onChange={(e) => setMaxStops(Number(e.target.value))}
                    className="qs-input"
                    disabled={!includeStops}
                  >
                    <option value={1}>{t("stopsOne")}</option>
                    <option value={2}>{t("stopsTwo")}</option>
                  </select>
                </label>
                <label className="field">
                  {t("riskAllowed")}
                  <select
                    name="risk_filter"
                    autoComplete="off"
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value as "all" | "low" | "medium" | "high")}
                    className="qs-input"
                  >
                    <option value="all">{t("riskAll")}</option>
                    <option value="low">{t("riskLow")}</option>
                    <option value="medium">{t("riskMedium")}</option>
                    <option value="high">{t("riskHigh")}</option>
                  </select>
                </label>
                <label className="field">
                  {t("bufferMin")}
                  <input
                    name="buffer_min"
                    autoComplete="off"
                    value={bufferMin}
                    onChange={(e) => setBufferMin(e.target.value)}
                    placeholder="45"
                    className="qs-input"
                    disabled={!includeStops}
                  />
                  <small className="muted">{t("bufferMinHint")}</small>
                </label>
                <div className="field">
                  <span>{t("excludeOrigins")}</span>
                  <div className="qs-chip-input">
                    {excludeOrigins.map((iata) => (
                      <button
                        key={`origin-${iata}`}
                        type="button"
                        className="qs-chip"
                        onClick={() => removeChip(iata, excludeOrigins, setExcludeOrigins)}
                        aria-label={`Eliminar ${iata}`}
                      >
                        {iata} <span aria-hidden="true">x</span>
                      </button>
                    ))}
                    <input
                      name="exclude_origins"
                      autoComplete="off"
                      value={excludeOriginInput}
                      onChange={(e) => setExcludeOriginInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "," || e.key === " ") {
                          e.preventDefault();
                          addChip(excludeOriginInput, excludeOrigins, setExcludeOrigins, setExcludeOriginInput);
                        }
                      }}
                      onBlur={() => addChip(excludeOriginInput, excludeOrigins, setExcludeOrigins, setExcludeOriginInput)}
                      placeholder="MAD, BCN"
                      className="qs-input"
                    />
                  </div>
                </div>
                <div className="field">
                  <span>{t("excludeDestinations")}</span>
                  <div className="qs-chip-input">
                    {excludeDestinations.map((iata) => (
                      <button
                        key={`dest-${iata}`}
                        type="button"
                        className="qs-chip"
                        onClick={() => removeChip(iata, excludeDestinations, setExcludeDestinations)}
                        aria-label={`Eliminar ${iata}`}
                      >
                        {iata} <span aria-hidden="true">x</span>
                      </button>
                    ))}
                    <input
                      name="exclude_destinations"
                      autoComplete="off"
                      value={excludeDestinationInput}
                      onChange={(e) => setExcludeDestinationInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "," || e.key === " ") {
                          e.preventDefault();
                          addChip(excludeDestinationInput, excludeDestinations, setExcludeDestinations, setExcludeDestinationInput);
                        }
                      }}
                      onBlur={() => addChip(excludeDestinationInput, excludeDestinations, setExcludeDestinations, setExcludeDestinationInput)}
                      placeholder="DUB, LIS"
                      className="qs-input"
                    />
                  </div>
                </div>
              </div>
              {includeStops ? (
                <div className="qs-warning qs-warning-warm">
                  {t("selfConnectWarning")}
                </div>
              ) : null}
              </div>
            </details>
          </div>
          <div className="qs-filter-actions">
            <button type="button" className="btn-ghost" onClick={applyPreferences} disabled={!pref}>
              {t("resetPrefs")}
            </button>
          </div>
        </aside>
        <section className="panel panel-soft qs-results-panel">
          <div className="qs-results-toolbar" ref={resultsToolbarRef} tabIndex={-1}>
            <div className="qs-results-summary">
              <strong>{visibleResults.length}</strong> {t("results")}
              {hasSearched ? <span className="muted"> - {t("orderedBy")} {sortLabel[sortBy]}</span> : null}
              {searchMeta?.truncated ? <span className="chip chip-warn">{t("truncated")}</span> : null}
            </div>
            <div className="qs-results-controls">
              <label className="field">
                {t("orderBy")}
                <select
                  name="sort_by"
                  autoComplete="off"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "ranking" | "price" | "duration" | "risk" | "freshness")}
                  className="qs-input"
                >
                  <option value="ranking">{t("sortRanking")}</option>
                  <option value="price">{t("sortPrice")}</option>
                  <option value="duration">{t("sortDuration")}</option>
                  <option value="risk">{t("sortRisk")}</option>
                  <option value="freshness">{t("sortFreshness")}</option>
                </select>
              </label>
              <button
                type="button"
                className={`btn-ghost ${compactView ? "is-active" : ""}`}
                onClick={() => setCompactView((prev) => !prev)}
              >
                {compactView ? t("toolbarExpanded") : t("toolbarCompact")}
              </button>
              <button type="button" className="btn-ghost qs-filters-toggle" onClick={() => setIsFiltersOpen(true)}>
                {t("toolbarFilters")}
              </button>
            </div>
          </div>
          <details className="qs-explain-popover">
            <summary className="qs-explain-trigger" role="button">
              <span aria-hidden="true">ⓘ</span> {t("explainTitle")}
            </summary>
            <div className="panel panel-soft qs-explain-panel">
              <div className="panel-header">
                <h2>{t("explainTitle")}</h2>
                <span className="muted">{t("explainSubtitle")}</span>
              </div>
              <div className="qs-explain-grid">
                <div>
                  <strong>{t("explainPriceTitle")}</strong>
                  <p>{t("explainPrice")}</p>
                </div>
                <div>
                  <strong>{t("explainTimeTitle")}</strong>
                  <p>{t("explainTime")}</p>
                </div>
                <div>
                  <strong>{t("explainAltTitle")}</strong>
                  <p>{t("explainAlt")}</p>
                </div>
                <div>
                  <strong>{t("explainRiskTitle")}</strong>
                  <p>{t("explainRisk")}</p>
                </div>
              </div>
              <div className="qs-explain-note">
                <span>{t("detailsNote")}</span>
              </div>
              {selectedResult ? (
                <div className="qs-explain-selected">
                  <strong>{selectedResult.origin} {" -> "} {selectedResult.destination}</strong>
                  <span>{t("score")}: {selectedResult.ranking_score ? formatScore(selectedResult.ranking_score) : "--"}</span>
                  <span>{t("riskAllowed")}: {formatRiskLabel(selectedResult.risk_label)}</span>
                  <span>{t("freshnessLabel")} {formatFreshness(selectedResult.freshness_ts)}</span>
                </div>
              ) : null}
            </div>
          </details>

          {activeChips.length > 0 ? (
            <div className="qs-active-chips">
              <span className="muted">{t("toolbarActiveFilters")}</span>
              {activeChips.map((chip) => (
                <button key={chip.id} type="button" className="qs-chip" onClick={chip.onClear}>
                  {chip.label} <span aria-hidden="true">x</span>
                </button>
              ))}
            </div>
          ) : null}

          {(isDegraded || searchMeta?.stale_data) ? (
            <div className="notice notice-compact notice-warn">
              <strong>{t("degradedBadge")}</strong> - {t("degradedHint")}
              {searchMeta?.freshness_ts ? (
                <span> - {t("lastData")}: {new Date(searchMeta.freshness_ts).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })}</span>
              ) : null}
            </div>
          ) : null}
          {filtersMeta?.relaxed && filtersMeta.relaxed.length > 0 ? (
            <div className="notice notice-compact notice-success">
              {t("filtersRelaxed")}: {filtersMeta.relaxed.join(", ")}.
            </div>
          ) : null}
          {filtersNotice.length > 0 ? (
            <div className="notice notice-compact notice-error">
              {filtersNotice.map((notice, idx) => (
                <span key={`${notice}-${idx}`}>{notice}</span>
              ))}
            </div>
          ) : null}
          {searchState === "idle" ? (
            <div className="qs-state">
              <h3>{t("searchReadyTitle")}</h3>
              <p>{t("searchReadyText")}</p>
              <span className="muted">{t("searchReadyHint")}</span>
            </div>
          ) : null}
          {searchState === "loading" ? (
            <div className="qs-state qs-state-loading">
              <AirLoader
                label={t("loadingFlight")}
                ariaLabel={t("loadingAria")}
                size={0.72}
              />
              <h3>{t("loadingTitle")}</h3>
              <p>{t("loadingText")}</p>
              <div className="qs-skeleton">
                {Array.from({ length: 7 }).map((_, idx) => (
                  <div key={`skeleton-${idx}`} className="qs-skeleton-row" />
                ))}
              </div>
            </div>
          ) : null}
          {searchState === "rate" ? (
            <div className="qs-state">
              <h3>{t("rateLimitTitle")}</h3>
              <p>{t("rateLimitText")}</p>
              <span className="muted">{t("rateLimitCountdown")} {rateLimitSeconds}s</span>
            </div>
          ) : null}
          {searchState === "error" ? (
            <div className="qs-state">
              <h3>{t("errorTitle")}</h3>
              <p>{searchError || t("searchFailed")}</p>
              <button type="button" className="btn-ghost" onClick={runSearch}>
                {t("errorRetry")}
              </button>
            </div>
          ) : null}
          {searchState === "empty" ? (
            <div className="qs-state">
              <h3>{t("emptyTitle")}</h3>
              <p>{t("emptyText")}</p>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setStrictFilters(false);
                  setRiskFilter("all");
                  setPriceMin("");
                  setPriceMax("");
                }}
              >
                {t("emptyCta")}
              </button>
            </div>
          ) : null}

          {visibleResults.length > 0 ? (
            <div className={`qs-results-list ${compactView ? "compact" : ""}`}>
              <div className="qs-results-head-row">
                <span>{t("resultsColRoute")}</span>
                <span>{t("resultsColPrice")}</span>
                <span>{t("resultsColDuration")}</span>
                <span>{t("resultsColRisk")}</span>
                <span>{t("resultsColFreshness")}</span>
                <span>{t("resultsColActions")}</span>
              </div>
              {visibleResults.map((r, idx) => {
                const rowId = resultKey(r, idx);
                const rowLink = r.deeplink_url || deeplinkUrl;
                const expanded = Boolean(expandedRows[rowId]);
                const detailsId = `details-${rowId}`;
                return (
                  <article
                    key={rowId}
                    className={`qs-result-row ${expanded ? "expanded" : ""}`}
                  >
                    <div className="qs-result-main">
                      <div className="qs-result-route">
                        <strong>{r.origin}{" -> "}{r.destination}</strong>
                        {(r.origin !== origin || r.destination !== destination) ? (
                          <span className="chip">{t("alternative")}</span>
                        ) : null}
                        {r.itinerary_type ? (
                          <span className="chip chip-soft">
                            {r.itinerary_type === "self_connect" ? t("itinerarySelfConnect") : t("itineraryDirect")}
                          </span>
                        ) : null}
                      </div>
                      <div className="qs-result-meta">
                        <span>{r.travel_date}</span>
                        {r.departure_time_local ? <span>{" - "}{r.departure_time_local}</span> : null}
                        {r.duration_total_min ? <span>{" - "}{r.duration_total_min} min</span> : null}
                        {r.distance_km_ground ? <span>{" - "}{r.distance_km_ground} km</span> : null}
                      </div>
                      <div className="qs-result-badges">
                        {r.risk_label ? (
                          <span className={`chip chip-risk chip-${r.risk_label}`}>{formatRiskLabel(r.risk_label)}</span>
                        ) : null}
                        {r.minutes_buffer ? <span className="chip chip-soft">{r.minutes_buffer} min buffer</span> : null}
                        {r.stale_data ? <span className="chip chip-warn">{t("stale")}</span> : null}
                      </div>
                      <div className="result-source">{t("source")}: {r.source}</div>
                    </div>
                    <div className="qs-result-actions">
                      <div className="qs-result-price">
                        <strong>{formatMoney(r.price_total ?? r.price, r.currency)}</strong>
                        {r.ranking_score ? <span>{t("score")} {formatScore(r.ranking_score)}</span> : null}
                        {r.freshness_ts ? <span>{t("freshnessLabel")} {formatFreshness(r.freshness_ts)}</span> : null}
                      </div>
                      <div className="qs-result-buttons">
                        <button className="btn-ghost" type="button" onClick={() => addToWatchlist(r)}>
                          {t("save")}
                        </button>
                        {rowLink ? (
                          <a
                            className="btn-ghost"
                            href={rowLink}
                            target="_blank"
                            rel="noreferrer"
                            onClick={trackOpenRyanair}
                          >
                            {t("deepLink")}
                          </a>
                        ) : (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => {
                              setCopyModalPayload(fallbackPayload);
                              setCopyModalOpen(true);
                            }}
                          >
                            {t("deepLinkAlt")}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost"
                          aria-expanded={expanded}
                          aria-controls={detailsId}
                          onClick={() => {
                            setExpandedRows((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
                            setSelectedResultId(rowId);
                          }}
                        >
                          {expanded ? t("detailsHide") : t("detailsToggle")}
                        </button>
                      </div>
                    </div>
                    {expanded ? (
                      <div className="qs-result-details" id={detailsId}>
                        <div>
                          <strong>{t("detailsAlt")}</strong>
                          <p>
                            {r.distance_km_ground ? `${r.distance_km_ground} km` : "--"} - {t("summaryRadius")} {radiusKm} km
                          </p>
                        </div>
                        <div>
                          <strong>{t("detailsWindow")}</strong>
                          <p>{departAfter} - {departBefore}</p>
                        </div>
                        <div>
                          <strong>{t("detailsRisk")}</strong>
                          <p>{formatRiskLabel(r.risk_label)} - {t("detailsBuffer")} {formatMinutes(r.minutes_buffer)}</p>
                        </div>
                        <div>
                          <strong>{t("detailsScore")}</strong>
                          <p>{t("scoreHint")} - {r.ranking_score ? formatScore(r.ranking_score) : "--"}</p>
                        </div>
                        {r.legs && r.legs.length > 0 ? (
                          <div className="qs-legs">
                            <strong>{t("detailsLegs")}</strong>
                            {r.legs.map((leg, legIdx) => (
                              <div key={`${rowId}-leg-${legIdx}`} className="qs-leg-row">
                                <span>{leg.origin_iata} {" -> "} {leg.destination_iata}</span>
                                <span>{new Date(leg.dep_ts).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })}</span>
                                <span>{new Date(leg.arr_ts).toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}

          {hiddenHighRiskResults.length > 0 ? (
            <div className="qs-hidden-risk">
              <span>{t("riskHidden")}: {hiddenHighRiskResults.length}</span>
              <button type="button" className="btn-ghost" onClick={() => setShowHighRisk((prev) => !prev)}>
                {showHighRisk ? t("riskHideHidden") : t("riskShowHidden")}
              </button>
            </div>
          ) : null}
        </section>
      </div>
      {activePicker ? (
        <div className="airport-modal-overlay" onClick={closePicker}>
          <section className="airport-modal" role="dialog" aria-modal="true" aria-label={t("modalPickTitle")} onClick={(event) => event.stopPropagation()}>
            <div className="airport-modal-left">
              <h2>{activePicker === "origin" ? t("modalOriginCountry") : t("modalDestinationCountry")}</h2>
              <div className="airport-country-grid">
                {COUNTRY_AIRPORTS.map((country) => {
                  const isActive = selectedCountry?.code === country.code;
                  return (
                    <button
                      key={country.code}
                      type="button"
                      className={isActive ? "country-pill active" : "country-pill"}
                      onClick={() => {
                        setSelectedCountry(country);
                        setCountrySelectionTouched(true);
                      }}
                    >
                      <span className="flag-badge" style={flagStyle(country.code)} aria-hidden="true" />
                      {country.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="airport-modal-right">
              <div className="airport-modal-header">
                <h3>{t("modalPickTitle")}</h3>
                <button type="button" className="link-reset" onClick={clearSelection}>
                  {t("modalClear")}
                </button>
              </div>
              {selectedCountry ? (
                <div className="section-gap-sm">
                  <button type="button" className="btn-secondary btn-compact" onClick={() => selectCountryOnly(selectedCountry)}>
                    {t("pickCountryOnly").replace("{country}", selectedCountry.name)}
                  </button>
                  <p className="panel-note">{t("pickCountryOnlyHint")}</p>
                </div>
              ) : null}
              <div className="airport-search">
                <input
                  className="qs-input"
                  name="airport_search"
                  autoComplete="off"
                  value={airportSearch}
                  onChange={(e) => setAirportSearch(e.target.value)}
                  placeholder={t("pickSearch")}
                />
              </div>
              {recentAirports.length > 0 ? (
                <div className="airport-recent">
                  <span className="muted">{t("pickRecent")}</span>
                  <div className="airport-recent-grid">
                    {recentAirports.map((iata) => (
                      <button key={`recent-${iata}`} type="button" onClick={() => selectAirport(iata)}>
                        {iata}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="airport-list">
                {(selectedCountry?.airports || [])
                  .filter((airport) => {
                    if (!airportSearch) return true;
                    const hay = `${airport.iata} ${airport.name}`.toLowerCase();
                    return hay.includes(airportSearch.toLowerCase());
                  })
                  .map((airport) => (
                    <button key={airport.iata} type="button" onClick={() => selectAirport(airport.iata)}>
                      <span className="flag-badge" style={flagStyle(selectedCountry?.code || "XX")} aria-hidden="true" />
                      {airport.name} <span>{airport.iata}</span>
                    </button>
                  ))}
                {(selectedCountry?.airports || []).length === 0 ? (
                  <p className="panel-note">{t("pickEmpty")}</p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {copyModalOpen ? (
        <div className="airport-modal-overlay" onClick={() => setCopyModalOpen(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label={t("deepLinkModalTitle")} onClick={(event) => event.stopPropagation()}>
            <div className="modal-card-header">
              <h3>{t("deepLinkModalTitle")}</h3>
              <button type="button" className="btn-ghost" onClick={() => setCopyModalOpen(false)}>
                {t("pickClose")}
              </button>
            </div>
            <p className="panel-note">{t("deepLinkModalBody")}</p>
            <textarea
              className="qs-input qs-copy-area"
              name="deeplink_payload"
              autoComplete="off"
              value={copyModalPayload}
              readOnly
              rows={5}
            />
            <div className="modal-card-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await navigator.clipboard.writeText(copyModalPayload);
                  setToast({ message: t("deepLinkCopied") });
                  setCopyModalOpen(false);
                }}
              >
                {t("deepLinkCopy")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div className="notice notice-success qs-toast">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button type="button" className="btn-ghost" onClick={toast.onAction}>
              {toast.actionLabel}
            </button>
          ) : null}
          <button type="button" className="btn-ghost" aria-label={t("pickClose")} onClick={() => setToast(null)}>x</button>
        </div>
      ) : null}

      {deepLinkError ? <div className="notice notice-error section-gap-sm">{deepLinkError}</div> : null}
      {message ? (
        <div className={`notice section-gap ${messageType === "success" ? "notice-success" : "notice-error"}`}>
          {message}
        </div>
      ) : null}
      {weatherMessage ? <div className="notice notice-error section-gap-sm">{weatherMessage}</div> : null}

      {(weatherOrigin || weatherDestination) ? (
        <section className="panel panel-soft section-gap">
          <div className="panel-header">
            <h2>{t("weatherTitle")}</h2>
            <span className="muted">{t("weatherSubtitle")}</span>
          </div>
          <div className="weather-grid">
            {weatherOrigin ? (
              <div className="weather-group">
                <h3>
                  {weatherOrigin.city} ({weatherOrigin.iata}) - {t("weatherOrigin")}
                </h3>
                <div className="weather-days">
                  {weatherOrigin.days.map((day) => {
                    const dateLabel = new Date(day.date).toLocaleDateString(localeTag, { weekday: "short", day: "2-digit", month: "short" });
                    return (
                      <div key={`${weatherOrigin.iata}-${day.date}`} className="cardm">
                        <div className="card">
                          <div className="weather">
                            <strong>{dateLabel}</strong>
                            <div className="main">{Math.round(day.tempMax)} C</div>
                            <div className="mainsub">{Math.round(day.tempMin)} C</div>
                          </div>
                          <div className="upper">
                            <span>{day.description}</span>
                            <span>{day.precipProb ?? 0}%</span>
                          </div>
                          <div className="humiditytext">precip</div>
                          <div className="airtext">clima</div>
                        </div>
                        <div className="card2">
                          <div className="lower">
                            <div className="aqi">Max {Math.round(day.tempMax)} C</div>
                            <div className="realfeel">Min {Math.round(day.tempMin)} C</div>
                            <div>Prob {day.precipProb ?? 0}%</div>
                          </div>
                        </div>
                        <div className="card3">{t("weatherDepart")}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {weatherDestination ? (
              <div className="weather-group">
                <h3>
                  {weatherDestination.city} ({weatherDestination.iata}) - {t("weatherDestination")}
                </h3>
                <div className="weather-days">
                  {weatherDestination.days.map((day) => {
                    const dateLabel = new Date(day.date).toLocaleDateString(localeTag, { weekday: "short", day: "2-digit", month: "short" });
                    return (
                      <div key={`${weatherDestination.iata}-${day.date}`} className="cardm">
                        <div className="card">
                          <div className="weather">
                            <strong>{dateLabel}</strong>
                            <div className="main">{Math.round(day.tempMax)} C</div>
                            <div className="mainsub">{Math.round(day.tempMin)} C</div>
                          </div>
                          <div className="upper">
                            <span>{day.description}</span>
                            <span>{day.precipProb ?? 0}%</span>
                          </div>
                          <div className="humiditytext">precip</div>
                          <div className="airtext">clima</div>
                        </div>
                        <div className="card2">
                          <div className="lower">
                            <div className="aqi">Max {Math.round(day.tempMax)} C</div>
                            <div className="realfeel">Min {Math.round(day.tempMin)} C</div>
                            <div>Prob {day.precipProb ?? 0}%</div>
                          </div>
                        </div>
                        <div className="card3">{t("weatherArrive")}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel panel-soft section-gap">
        <p className="panel-note qs-disclaimer">
          {t("disclaimer")}
        </p>
      </section>
    </main>
  );
}

export default function QuickSearchPage() {
  return <QuickSearchView mode="quick-search" />;
}


