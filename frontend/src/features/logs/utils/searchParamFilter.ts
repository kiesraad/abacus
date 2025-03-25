import { LogFilterState } from "../hooks/useAuditLog";
import { LogFilterNames } from "../hooks/useLogFilterOptions";

export function getLogFilterOptionsFromSearchParams(searchPareams: URLSearchParams): LogFilterState {
  return {
    event: searchPareams.getAll("event"),
    level: searchPareams.getAll("level"),
    user: searchPareams.getAll("user"),
    since: searchPareams.get("since") ?? undefined,
  };
}

export function hasLogFilters(searchParams: URLSearchParams): boolean {
  return LogFilterNames.some((filterName) => searchParams.has(filterName)) || searchParams.has("since");
}

export function clearEmptySince(filterState: LogFilterState): LogFilterState {
  if (!filterState.since) {
    delete filterState.since;
  }

  return filterState;
}
