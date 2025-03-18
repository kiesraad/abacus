import { useState } from "react";

import { ErrorModal } from "app/component/error";

import { AuditLogEvent, useAuditLog } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconFilter } from "@kiesraad/icon";
import { Button, Loader, PageTitle, Pagination, Toolbar, ToolbarSection } from "@kiesraad/ui";

import { LogFilter } from "./filter/LogFilter";
import { LogDetailsModal } from "./LogDetailsModal";
import { LogsTable } from "./LogsTable";

export function LogsHomePage() {
  const { showFilter, setShowFilter, pagination, events, requestState, onPageChange, filterState, toggleFilter } =
    useAuditLog();
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
            onClose={() => {
              setShowFilter(false);
            }}
          />
        )}
        <article>
          <Toolbar fixedHeight>
            {!showFilter && (
              <ToolbarSection>
                <Button
                  variant="secondary"
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
