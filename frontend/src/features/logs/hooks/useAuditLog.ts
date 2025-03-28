import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { AUDIT_LOG_LIST_REQUEST_PATH, AuditLogEvent, AuditLogListResponse, useInitialApiGet } from "@kiesraad/api";

import { clearEmptySince, getLogFilterOptionsFromSearchParams, hasLogFilters } from "../utils/searchParamFilter";
import { LogFilterName } from "./useLogFilterOptions";

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
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const { requestState } = useInitialApiGet<AuditLogListResponse>(`${path}?${searchParams}`);
  const [showFilter, setShowFilter] = useState(hasLogFilters(searchParams));
  const [filterState, setFilterState] = useState<LogFilterState>(getLogFilterOptionsFromSearchParams(searchParams));

  // Set the since date time filter
  const setSince = (since: string) => {
    const newFilterState = clearEmptySince({ ...filterState, since });
    setFilterState(newFilterState);
    setSearchParams({ ...newFilterState });
  };

  // Toggle a value in the filter state
  const toggleFilter = (filterName: LogFilterName, value: string, checked: boolean) => {
    const currentOptions = filterState[filterName];
    const newFilterState = clearEmptySince({
      ...filterState,
      [filterName]: checked ? [...currentOptions, value] : currentOptions.filter((v) => v !== value),
    });
    setFilterState(newFilterState);
    setSearchParams({ ...newFilterState });
  };

  // Assign current state based on request result
  useEffect(() => {
    if (requestState.status === "success") {
      setEvents(requestState.data.events);
      setPagination({
        page: requestState.data.page,
        totalPages: requestState.data.pages,
      });
    }
  }, [requestState]);

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
