import { LogFilterState } from "../hooks/useAuditLog";
import { LogFilterNames } from "../hooks/useLogFilterOptions";

export function getLogFilterOptionsFromSearchParams(searchParams: URLSearchParams): LogFilterState {
  return {
    event: searchParams.getAll("event"),
    level: searchParams.getAll("level"),
    user: searchParams.getAll("user"),
    since: searchParams.get("since") ?? undefined,
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
