import { Fragment, useState } from "react";

import { ErrorModal } from "@/component/error";

import { AuditLogEvent, Role, useAuditLog } from "@kiesraad/api";
import { t, TranslationPath } from "@kiesraad/i18n";
import { IconFilter } from "@kiesraad/icon";
import { Button, Loader, Modal, PageTitle, Pagination, Table, Toolbar, ToolbarSection } from "@kiesraad/ui";
import { formatDateTime, formatDateTimeFull } from "@kiesraad/util";

import cls from "./LogsHomePage.module.css";

export function LogsHomePage() {
  const { pagination, events, requestState, onPageChange } = useAuditLog();
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
        <article>
          <Toolbar>
            <Button
              variant="secondary"
              onClick={() => {
                window.alert("Not yet implemented");
              }}
            >
              <IconFilter /> {t("log.action.filter")}
            </Button>
            {pagination && pagination.totalPages > 1 && (
              <ToolbarSection pos="end">
                <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={onPageChange} />
              </ToolbarSection>
            )}
          </Toolbar>

          {details && (
            <Modal
              title={t(`log.event.${details.event.eventType}`)}
              onClose={() => {
                setDetails(null);
              }}
            >
              <div>
                <dl className={cls.details}>
                  <dt>{t("log.header.time")}</dt>
                  <dd>{formatDateTimeFull(new Date(details.time))}</dd>
                  <dt>{t("log.header.user")}</dt>
                  <dd>
                    {details.userFullname || details.username}
                    {details.userRole && ` (${t(details.userRole as Role)})`}
                  </dd>
                  <dt>{t("log.header.message")}</dt>
                  <dd>{details.message || "-"}</dd>
                  <dt>{t("log.field.ip")}</dt>
                  <dd>{details.ip}</dd>
                  {Object.entries(details.event)
                    .filter(([k]) => k !== "eventType")
                    .map(([key, value]) => (
                      <Fragment key={key}>
                        <dt>{t(`log.field.${key}` as TranslationPath)}</dt>
                        <dd>{value}</dd>
                      </Fragment>
                    ))}
                </dl>
              </div>
            </Modal>
          )}

          <Table id="users">
            <Table.Header>
              <Table.HeaderCell>{t("number")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.time")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.workstation")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.level")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.event")}</Table.HeaderCell>
              <Table.HeaderCell>{t("log.header.user")}</Table.HeaderCell>
            </Table.Header>
            <Table.Body className="fs-md">
              {events.length == 0 && (
                <Table.Row>
                  <Table.Cell colSpan={7}>{t("log.no_events")}</Table.Cell>
                </Table.Row>
              )}
              {events.map((event) => (
                <Table.ClickRow
                  key={event.id}
                  onClick={() => {
                    setDetails(event);
                  }}
                >
                  <Table.Cell>{event.id}</Table.Cell>
                  <Table.Cell>{formatDateTime(new Date(event.time), false)}</Table.Cell>
                  <Table.Cell>{event.workstation || "-"}</Table.Cell>
                  <Table.Cell>{t(`log.level.${event.eventLevel}`)}</Table.Cell>
                  <Table.Cell>{t(`log.event.${event.event.eventType}`)}</Table.Cell>
                  <Table.Cell>
                    {event.userFullname || event.username}
                    {event.userRole && ` (${t(event.userRole as Role)})`}
                  </Table.Cell>
                </Table.ClickRow>
              ))}
            </Table.Body>
          </Table>

          {pagination && pagination.totalPages > 1 && (
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={onPageChange} />
          )}
        </article>
      </main>
    </>
  );
}
