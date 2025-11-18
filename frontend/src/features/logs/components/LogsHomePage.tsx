import { useState } from "react";

import { ErrorModal } from "@/components/error/ErrorModal";
import { IconFilter } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { Toolbar } from "@/components/ui/Toolbar/Toolbar";
import { t } from "@/i18n/translate";
import { AuditLogEvent } from "@/types/generated/openapi";

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
              <Toolbar.Section>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowFilter(true);
                  }}
                >
                  <IconFilter /> {t("log.action.filter")}
                </Button>
              </Toolbar.Section>
            )}
            {pagination && pagination.totalPages > 1 && (
              <Toolbar.Section pos="end">
                <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={onPageChange} />
              </Toolbar.Section>
            )}
          </Toolbar>
          <LogsTable events={events} details={details} setDetails={setDetails} />
          {pagination && pagination.totalPages > 1 && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={onPageChange} />
          )}
        </article>
      </main>
    </>
  );
}
