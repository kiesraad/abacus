import { locale, translations } from "@kiesraad/i18n";

export const LogFilterNames = ["event", "level"] as const;
export type LogFilterName = (typeof LogFilterNames)[number];

export type LogFilterOptions = Array<
  [
    LogFilterName,
    Array<{
      value: string;
      label: string;
    }>,
  ]
>;

export function getFilterOptions(): LogFilterOptions {
  const source = translations[locale].log;

  return LogFilterNames.map((filterName) => [
    filterName,
    Object.entries(source[filterName]).map(([value, label]) => ({
      value,
      label,
    })),
  ]);
}

export function getOptionsFromSearchParams(searchPareams: URLSearchParams): Record<LogFilterName, string[]> {
  return {
    event: searchPareams.getAll("event"),
    level: searchPareams.getAll("level"),
  };
}

export function isFiltered(searchParams: URLSearchParams): boolean {
  return LogFilterNames.some((filterName) => searchParams.has(filterName));
}
