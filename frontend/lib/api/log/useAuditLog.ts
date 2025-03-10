import { useEffect, useState } from "react";

import { AUDIT_LOG_LIST_REQUEST_PATH, AuditLogEvent, AuditLogListResponse, useApiRequest } from "@kiesraad/api";

export function useAuditLog() {
  const path: AUDIT_LOG_LIST_REQUEST_PATH = "/api/log";
  const [events, setEvents] = useState<AuditLogEvent[]>([]);

  const { requestState } = useApiRequest<AuditLogListResponse>(path);

  useEffect(() => {
    if (requestState.status === "success") {
      setEvents(requestState.data.events);
    }
  }, [requestState]);

  return { events, requestState };
}
