import { AuditLogEvent } from "@/api/gen/openapi";
import { Table } from "@/components/ui";
import { t } from "@/lib/i18n";
import { formatDateTime } from "@/lib/util/format";

interface LogsTableProps {
  events: AuditLogEvent[];
  setDetails: (details: AuditLogEvent) => void;
}

export function LogsTable({ events, setDetails }: LogsTableProps) {
  return (
    <Table id="users">
      <Table.Header>
        <Table.HeaderCell>{t("number")}</Table.HeaderCell>
        <Table.HeaderCell>{t("log.header.time")}</Table.HeaderCell>
        {/* <Table.HeaderCell>{t("log.header.workstation")}</Table.HeaderCell> */}
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
        {events.map((event: AuditLogEvent) => (
          <Table.ClickRow
            key={event.id}
            onClick={() => {
              setDetails(event);
            }}
          >
            <Table.Cell>{event.id}</Table.Cell>
            <Table.Cell>{formatDateTime(new Date(event.time), false)}</Table.Cell>
            {/* <Table.Cell>{event.workstation || "-"}</Table.Cell> */}
            <Table.Cell>{t(`log.level.${event.eventLevel}`)}</Table.Cell>
            <Table.Cell>
              {t(`log.event.${event.event.eventType}`)}
              {event.event.eventType == "Error" && `: ${t(`error.api_error.${event.event.reference}`)}`}
            </Table.Cell>
            <Table.Cell>{`${event.userId}, ${event.username} (${t(event.userRole)})`}</Table.Cell>
          </Table.ClickRow>
        ))}
      </Table.Body>
    </Table>
  );
}
