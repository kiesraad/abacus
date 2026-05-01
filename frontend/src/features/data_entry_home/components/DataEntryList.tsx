import { Alert } from "@/components/ui/Alert/Alert";
import { Badge } from "@/components/ui/Badge/Badge";
import { Table } from "@/components/ui/Table/Table";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";
import type { ElectionId } from "@/types/generated/openapi";
import { type DataEntryStatusWithUserStatus, getUrlForDataEntry } from "../utils/util";

export interface DataEntryListProps {
  electionId: ElectionId;
  dataEntries: DataEntryStatusWithUserStatus[];
}

export function DataEntryList({ electionId, dataEntries }: DataEntryListProps) {
  const user = useUser();

  if (!user) {
    return null;
  }

  return (
    <>
      <h3 className="mb-lg">{t("data_entry_home.choose_polling_station")}</h3>
      {dataEntries.length === 0 ? (
        <Alert type="notify" small>
          <p>{t("data_entry_home.there_are_no_polling_stations_left_to_fill_in")}</p>
        </Alert>
      ) : (
        <Table id="data_entry_list">
          <Table.Header>
            <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
            <Table.HeaderCell>{t("polling_station.title.singular")}</Table.HeaderCell>
          </Table.Header>
          <Table.Body>
            {dataEntries.map((dataEntry) => {
              const source = dataEntry.statusEntry.source;
              return (
                <Table.Row
                  id={`data-entry-row-${source.number}`}
                  key={source.number}
                  to={getUrlForDataEntry(electionId, dataEntry.statusEntry)}
                >
                  <Table.NumberCell>{source.number}</Table.NumberCell>
                  <Table.Cell>
                    <span>{source.name}</span>
                    <Badge type={dataEntry.statusEntry.status} userRole={user.role} showIcon />
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      )}
    </>
  );
}
