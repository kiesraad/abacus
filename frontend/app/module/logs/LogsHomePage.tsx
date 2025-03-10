import { t } from "@kiesraad/i18n";
import { Button, Loader, PageTitle, Table, Toolbar, ToolbarSection } from "@kiesraad/ui";
import { Role, useAuditLog } from "@kiesraad/api";
import { ErrorModal } from "app/component/error";
import { IconFilter } from "@kiesraad/icon";
import { Pagination } from "@kiesraad/ui";

export function LogsHomePage() {
  const { pagination, events, requestState, onPageChange } = useAuditLog();

  if (requestState.status === "loading") {
    return <Loader />;
  }

  return (
    <>
      <PageTitle title={`${t("activity_log")} - Abacus`} />
      {requestState.status === "api-error" && (
        <ErrorModal error={requestState.error} />
      )}
      <header>
        <section>
          <h1>{t("activity_log")}</h1>
        </section>
      </header>
      <main>
        <article>
          <Toolbar>
            <Button variant="secondary" onClick={() => { window.alert("Not yet implemented"); }}>
              <IconFilter /> {t("log.action.filter")}
            </Button>
            {pagination && pagination.totalPages > 1 && (
              <ToolbarSection pos="end">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={onPageChange}
                />
              </ToolbarSection>
            )}
          </Toolbar>

          <Table id="users">
            <Table.Header>
              <Table.HeaderCell>{t("number")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.time")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.workstation")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.level")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.event")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.message")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.user")}</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Header>
            <Table.Body className="fs-md">
              {events.length == 0 && (
                <Table.Row>
                  <Table.Cell colSpan={7}>{t("log.no_events")}</Table.Cell>
                </Table.Row>
              )}
              {events.map((event) => (
                <Table.Row key={event.id}>
                  <Table.Cell>{event.id}</Table.Cell>
                  <Table.Cell>{event.time}</Table.Cell>
                  <Table.Cell>{event.workstation || '-'}</Table.Cell>
                  <Table.Cell>{t(`log.level.${event.eventLevel}`)}</Table.Cell>
                  <Table.Cell>{t(`log.event.${event.event.event_type}`)}</Table.Cell>
                  <Table.Cell>{event.message}</Table.Cell>
                  <Table.Cell>
                    {event.userFullname || event.username}
                    {event.userRole && ` (${t(event.userRole as Role)})`}
                  </Table.Cell>
                  <Table.Cell className="text-align-r">
                    <Button variant="secondary" size="sm">
                      {t("log.action.details")}
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={onPageChange}
            />
          )}
        </article>
      </main>
    </>
  );
}
