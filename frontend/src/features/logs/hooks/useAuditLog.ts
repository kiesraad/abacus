import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { useInitialApiGet } from "@/api/useInitialApiGet";
import type { AUDIT_LOG_LIST_REQUEST_PATH, AuditLogListResponse } from "@/types/generated/openapi";

import { clearEmptySince, getLogFilterOptionsFromSearchParams, hasLogFilters } from "../utils/searchParamFilter";
import type { LogFilterName } from "./useLogFilterOptions";

interface Pagination {
  page: number;
  totalPages: number;
}

export interface LogFilterState {
  event: string[];
  level: string[];
  user: string[];
  since?: string;
}

export function useAuditLog() {
  const path: AUDIT_LOG_LIST_REQUEST_PATH = "/api/log";
  const [searchParams, setSearchParams] = useSearchParams();
  const { requestState } = useInitialApiGet<AuditLogListResponse>(`${path}?${searchParams}`);
  const [showFilter, setShowFilter] = useState(hasLogFilters(searchParams));

  // Get filter options based on the search params
  const filterState = useMemo(() => getLogFilterOptionsFromSearchParams(searchParams), [searchParams]);

  // Set the "since" date time filter
  const setSince = (since: string) => {
    setSearchParams({ ...clearEmptySince({ ...filterState, since }) });
  };

  // Toggle a value in the filter state
  const toggleFilter = (filterName: LogFilterName, value: string, checked: boolean) => {
    const currentOptions = filterState[filterName];
    const newFilterState = clearEmptySince({
      ...filterState,
      [filterName]: checked ? [...currentOptions, value] : currentOptions.filter((v) => v !== value),
    });
    setSearchParams({ ...newFilterState });
  };

  // Get events and pagination info
  const events = requestState.status === "success" ? requestState.data.events : [];
  const pagination = useMemo<Pagination | null>(
    () =>
      requestState.status === "success" ? { page: requestState.data.page, totalPages: requestState.data.pages } : null,
    [requestState],
  );

  // Paginate and keep filter values
  const onPageChange = (page: number) => {
    setSearchParams({
      ...clearEmptySince(filterState),
      page: page.toString(),
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchParams({});
  };

  return {
    clearFilters,
    events,
    filterState,
    onPageChange,
    pagination,
    requestState,
    setShowFilter,
    setSince,
    showFilter,
    toggleFilter,
  };
}
