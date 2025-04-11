import { useState } from "react";

import { AuditLogEvent } from "@/api/gen/openapi";
import { ErrorModal } from "@/components/error";
import { Button, Loader, PageTitle, Pagination, Toolbar, ToolbarSection } from "@/components/ui";
import { t } from "@/lib/i18n";
import { IconFilter } from "@/lib/icon";

import { useAuditLog } from "../hooks/useAuditLog";
import { LogDetailsModal } from "./LogDetailsModal";
import { LogFilter } from "./LogFilter";
import { LogsTable } from "./LogsTable";

export function LogsHomePage() {
  const {
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
  } = useAuditLog();
  const [details, setDetails] = useState<AuditLogEvent | null>(null);

  if (requestState.status === "loading") {
    return <Loader />;
  }

  return (
    <>
      <PageTitle title={`${t("activity_log")} - Abacus`} />
      {requestState.status === "api-error" && <ErrorModal error={requestState.error} />}
      <header>
        <section>
          <h1>{t("activity_log")}</h1>
        </section>
      </header>
      <main>
        {details && <LogDetailsModal details={details} setDetails={setDetails} />}
        {showFilter && (
          <LogFilter
            filterState={filterState}
            toggleFilter={toggleFilter}
            setSince={setSince}
            onClose={() => {
              clearFilters();
              setShowFilter(false);
            }}
          />
        )}
        <article>
          <Toolbar>
            {!showFilter && (
              <ToolbarSection>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowFilter(true);
                  }}
                >
                  <IconFilter /> {t("log.action.filter")}
                </Button>
              </ToolbarSection>
            )}
            {pagination && pagination.totalPages > 1 && (
              <ToolbarSection pos="end">
                <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={onPageChange} />
              </ToolbarSection>
            )}
          </Toolbar>
          <LogsTable events={events} setDetails={setDetails} />
          {pagination && pagination.totalPages > 1 && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={onPageChange} />
          )}
        </article>
      </main>
    </>
  );
}
