import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { getOptionsFromSearchParams, isFiltered, LogFilterName } from "app/module/logs/filter/FilterOptions";

import { AUDIT_LOG_LIST_REQUEST_PATH, AuditLogEvent, AuditLogListResponse, useInitialApiGet } from "@kiesraad/api";

interface Pagination {
  page: number;
  totalPages: number;
}

export function useAuditLog() {
  const path: AUDIT_LOG_LIST_REQUEST_PATH = "/api/log";
  const [searchParams, setSearchParams] = useSearchParams();
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const { requestState } = useInitialApiGet<AuditLogListResponse>(`${path}?${searchParams}`);
  const [showFilter, setShowFilter] = useState(isFiltered(searchParams));
  const [filterState, setFilterState] = useState<Record<LogFilterName, string[]>>(
    getOptionsFromSearchParams(searchParams),
  );

  // Toggle a value in the filter state
  const toggleFilter = (filterName: LogFilterName, value: string, checked: boolean) => {
    const currentOptions = filterState[filterName];
    const newFilterState = {
      ...filterState,
      [filterName]: checked ? [...currentOptions, value] : currentOptions.filter((v) => v !== value),
    };
    setFilterState(newFilterState);
    setSearchParams(newFilterState);
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

  return {
    showFilter,
    setShowFilter,
    pagination,
    onPageChange: (page: number) => {
      setSearchParams({ page: page.toString() });
    },
    events,
    requestState,
    filterState,
    toggleFilter,
  };
}
