import { useEffect, useMemo, useState } from "react";

import es from "./es";
import en from "./en";

export type Locale = "es" | "en";
export type LocaleTag = "es-ES" | "en-US";

type Dictionary = typeof es;
type DictValue = string | { one: string; other: string };

const DICTS: Record<Locale, Dictionary> = { es, en };
const LOCALE_TAGS: Record<Locale, LocaleTag> = { es: "es-ES", en: "en-US" };
const DEFAULT_LOCALE: Locale = "es";

export function normalizeLocale(raw?: string | null): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const lower = raw.trim().toLowerCase();
  if (lower.startsWith("en")) return "en";
  return "es";
}

export function resolveLocale(raw?: string | null): Locale {
  if (raw) return normalizeLocale(raw);
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = window.localStorage.getItem("viru_locale");
    if (stored) return normalizeLocale(stored);
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return normalizeLocale(navigator.language);
  }
  return DEFAULT_LOCALE;
}

export function localeTag(locale: Locale): LocaleTag {
  return LOCALE_TAGS[locale] || LOCALE_TAGS[DEFAULT_LOCALE];
}

export function persistLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("viru_locale", locale);
  if (document?.documentElement) {
    document.documentElement.lang = locale;
  }
}

function getNestedValue(dict: Dictionary, key: string): DictValue | null {
  const parts = key.split(".");
  let current: unknown = dict;
  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current === "string") return current;
  if (current && typeof current === "object" && "one" in (current as Record<string, unknown>)) {
    return current as { one: string; other: string };
  }
  return null;
}

function formatTemplate(value: string, params?: Record<string, string | number>) {
  if (!params) return value;
  return Object.entries(params).reduce((acc, [key, paramValue]) => {
    return acc.replaceAll(`{${key}}`, String(paramValue));
  }, value);
}

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const dict = DICTS[locale] || DICTS[DEFAULT_LOCALE];
  const entry = getNestedValue(dict, key) ?? getNestedValue(DICTS[DEFAULT_LOCALE], key);
  if (!entry) {
    return key;
  }
  if (typeof entry === "string") {
    return formatTemplate(entry, params);
  }
  const countValue = typeof params?.count === "number" ? params?.count : Number(params?.count);
  const choice = Number.isFinite(countValue) && Number(countValue) === 1 ? entry.one : entry.other;
  return formatTemplate(choice, params);
}

export function translate(key: string, params?: Record<string, string | number>, rawLocale?: string | null): string {
  const locale = resolveLocale(rawLocale);
  return t(locale, key, params);
}

export function useI18n(rawLocale?: string | null) {
  const [locale, setLocale] = useState<Locale>(() => normalizeLocale(rawLocale));

  useEffect(() => {
    if (rawLocale) {
      setLocale(normalizeLocale(rawLocale));
      return;
    }
    setLocale(resolveLocale());
  }, [rawLocale]);

  const localeKey = localeTag(locale);
  const translator = useMemo(() => (key: string, params?: Record<string, string | number>) => t(locale, key, params), [locale]);
  return { locale, localeTag: localeKey, t: translator };
}
