import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { AUDIT_LOG_LIST_REQUEST_PATH, AuditLogEvent, AuditLogListResponse, useApiRequest } from "@kiesraad/api";

interface Pagination {
  page: number;
  totalPages: number;
}

export function useAuditLog() {
  const path: AUDIT_LOG_LIST_REQUEST_PATH = "/api/log";
  const [searchParams, setSearchParams] = useSearchParams();
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const { requestState } = useApiRequest<AuditLogListResponse>(`${path}?${searchParams}`);

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
    pagination,
    onPageChange: (page: number) => {
      setSearchParams({ page: page.toString() });
    },
    events,
    requestState,
  };
}
