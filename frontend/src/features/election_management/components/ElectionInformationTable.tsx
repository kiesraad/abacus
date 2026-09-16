import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import type { CommitteeSession, ElectionWithPoliticalGroups, Role } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { formatNumber } from "@/utils/number";

import cls from "./ElectionManagement.module.css";

interface ElectionInformationTableProps {
  election: ElectionWithPoliticalGroups;
  committeeSession: CommitteeSession;
  numberOfPollingStations: number;
  role?: Role;
  publicKeyRegistered?: boolean;
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

export function ElectionInformationTable({
  election,
  committeeSession,
  numberOfPollingStations,
  role,
  publicKeyRegistered,
}: ElectionInformationTableProps) {
  const rowLink =
    committeeSession.number === 1 &&
    (committeeSession.status === "created" || committeeSession.status === "in_preparation")
      ? "number-of-voters"
      : undefined;
  return (
    <Table id="election-information-table" variant="information" className={cn(cls.electionInformationTable)}>
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
            {election.authority_id} - {t("municipality")} {election.authority_region}
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("election_management.lists_and_candidates")}
          </Table.HeaderCell>
          <Table.Cell>{getListsAndCandidatesLabel(election)}</Table.Cell>
        </Table.Row>
        {election.committee_category === "GSB" && (
          <Table.Row to={rowLink}>
            <Table.HeaderCell scope="row" className="normal">
              {t("number_of_voters")}
            </Table.HeaderCell>
            <Table.Cell className={rowLink && "underlined"}>
              {election.number_of_voters ? formatNumber(election.number_of_voters) : "0"}
            </Table.Cell>
          </Table.Row>
        )}
        <Table.Row>
          <Table.HeaderCell scope="row" className="normal">
            {t("election.committee_category.title")}
          </Table.HeaderCell>
          <Table.Cell>{t(`committee_category.${election.committee_category}.short`)}</Table.Cell>
        </Table.Row>
        {election.committee_category === "GSB" && (
          <>
            {role === "administrator" && (
              <Table.Row to="certificate">
                <Table.HeaderCell scope="row" className="normal">
                  {t("election_certificate.certificate")}
                </Table.HeaderCell>
                <Table.Cell className="underlined">
                  {publicKeyRegistered
                    ? t("election_certificate.details")
                    : t("election_certificate.not_yet_registered")}
                </Table.Cell>
              </Table.Row>
            )}
            <Table.Row key={election.id} to="polling-stations">
              <Table.HeaderCell scope="row" className="normal">
                {t("polling_station.title.plural")}
              </Table.HeaderCell>
              <Table.Cell className="underlined">
                {numberOfPollingStations}{" "}
                {t(`polling_station.title.${numberOfPollingStations === 1 ? "singular" : "plural"}`).toLowerCase()}
              </Table.Cell>
            </Table.Row>
            {election.counting_method && (
              <Table.Row>
                <Table.HeaderCell scope="row" className="normal">
                  {t("counting_method_type")}
                </Table.HeaderCell>
                <Table.Cell>{t(election.counting_method)}</Table.Cell>
              </Table.Row>
            )}
          </>
        )}
      </Table.Body>
    </Table>
  );
}
