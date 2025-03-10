import { t } from "@kiesraad/i18n";
import { Button, Loader, PageTitle, Table, Toolbar } from "@kiesraad/ui";
import { Role, useAuditLog } from "@kiesraad/api";
import { ErrorModal } from "app/component/error";
import { IconFilter } from "@kiesraad/icon";

export function LogsHomePage() {
  const { events, requestState } = useAuditLog();

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
            <Button variant="secondary" size="sm" onClick={() => { window.alert("Not yet implemented"); }}>
              <IconFilter /> {t("log.action.filter")}
            </Button>
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
                  <Table.Cell>{t(`log.level.${event.event_level}`)}</Table.Cell>
                  <Table.Cell>{t(`log.event.${event.event.event_type}`)}</Table.Cell>
                  <Table.Cell>{event.message}</Table.Cell>
                  <Table.Cell>
                    {event.user_fullname || event.username}
                    {event.user_role && ` (${t(event.user_role as Role)})`}
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

        </article>
      </main>
    </>
  );
}
