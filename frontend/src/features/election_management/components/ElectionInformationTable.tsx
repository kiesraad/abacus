import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { ElectionWithPoliticalGroups } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatNumber } from "@/utils/format";

import cls from "./ElectionManagement.module.css";

interface ElectionInformationTableProps {
  election: ElectionWithPoliticalGroups;
  numberOfPollingStations: number;
}

function getListsAndCandidatesLabel(election: ElectionWithPoliticalGroups) {
  let label = "";
  let number_of_candidates: number = 0;
  election.political_groups.forEach((ps) => {
    number_of_candidates += ps.candidates.length;
  });
  label += `${election.political_groups.length} ${t(`list${election.political_groups.length === 1 ? "" : "s"}`).toLowerCase()}`;
  label += ` ${t("and").toLowerCase()} ${number_of_candidates} ${t(`candidate.title.${number_of_candidates === 1 ? "singular" : "plural"}`).toLowerCase()}`;
  return label;
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
          <Table.Cell>
            {election.domain_id} - {t("municipality")} {election.location}
          </Table.Cell>
        </Table.Row>
        <Table.Row increasedPadding>
          <Table.HeaderCell scope="row" className="normal">
            {t("election_management.lists_and_candidates")}
          </Table.HeaderCell>
          <Table.Cell>{getListsAndCandidatesLabel(election)}</Table.Cell>
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
        <Table.Row increasedPadding>
          <Table.HeaderCell scope="row" className="normal">
            {t("election_management.to_do_data_entry_for")}
          </Table.HeaderCell>
          <Table.Cell></Table.Cell>
        </Table.Row>
        <Table.LinkRow key={election.id} to={`polling-stations`}>
          <Table.HeaderCell scope="row" className="normal">
            {t("polling_station.title.plural")}
          </Table.HeaderCell>
          <Table.Cell className="underlined">
            {numberOfPollingStations}{" "}
            {t(`polling_station.title.${numberOfPollingStations === 1 ? "singular" : "plural"}`).toLowerCase()}
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
