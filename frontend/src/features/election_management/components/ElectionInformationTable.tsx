import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { Election } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatNumber } from "@/utils/format";

import cls from "./ElectionManagement.module.css";

interface ElectionInformationTableProps {
  election: Election;
  numberOfPollingStations: number;
}

export function ElectionInformationTable({ election, numberOfPollingStations }: ElectionInformationTableProps) {
  return (
    <Table id="election-information-table" className={cn(cls.table, cls.electionInformationTable)}>
      <Table.Body>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("election.title.singular")}
          </Table.HeaderCell>
          <Table.Cell>
            {election.name},{" "}
            {new Date(election.election_date).toLocaleString(t("date_locale"), { day: "numeric", month: "long" })}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("election_management.electoral_area")}
          </Table.HeaderCell>
          <Table.Cell></Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("election_management.lists_and_candidates")}
          </Table.HeaderCell>
          <Table.Cell></Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("number_of_voters")}
          </Table.HeaderCell>
          <Table.Cell>
            {election.number_of_voters
              ? formatNumber(election.number_of_voters)
              : t("election_management.still_to_input")}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("election_management.to_do_data_entry_for")}
          </Table.HeaderCell>
          <Table.Cell></Table.Cell>
        </Table.Row>
        <Table.LinkRow key={election.id} to={`polling-stations`}>
          <Table.HeaderCell scope="row" className="normal">
            {t("polling_stations")}
          </Table.HeaderCell>
          <Table.Cell className="underlined">
            {numberOfPollingStations} {t("polling_stations").toLowerCase()}
          </Table.Cell>
        </Table.LinkRow>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("counting_method_type")}
          </Table.HeaderCell>
          <Table.Cell></Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  );
}
