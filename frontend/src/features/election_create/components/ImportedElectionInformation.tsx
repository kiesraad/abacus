import { t } from "@/i18n/translate";
import type {
  CommitteeCategory,
  NewElection,
  PollingStationRequest,
  VoteCountingMethod,
} from "@/types/generated/openapi";
import { formatNumber } from "@/utils/number";

interface ImportedElectionInformationProps {
  election: NewElection;
  committeeCategory: CommitteeCategory;
  pollingStations?: PollingStationRequest[] | null;
  countingMethod?: VoteCountingMethod;
  numberOfVoters?: number;
}

export function ImportedElectionInformation({
  election,
  committeeCategory,
  pollingStations,
  countingMethod,
  numberOfVoters,
}: ImportedElectionInformationProps) {
  let numCandidates = 0;
  election.political_groups.forEach((pg) => {
    numCandidates += pg.candidates.length;
  });
  return (
    <>
      <ul>
        <li id="election-name">
          <strong>{t("election.singular")}:</strong> {election.name}
        </li>
        <li id="committee-category">
          <strong>{t("election.committee_category.title").toLowerCase()}:</strong>{" "}
          {t(`committee_category.${committeeCategory}.short`)}
        </li>
        <li id="election-location">
          <strong>{t("area_designation")}:</strong> {election.location}
        </li>
      </ul>
      <ul>
        {election.political_groups.length > 0 && (
          <li id="lists-and-candidates">
            {t("election.political_groups_added", {
              num_groups: election.political_groups.length,
              num_candidates: numCandidates,
            })}
          </li>
        )}
        {pollingStations && (
          <li id="polling-stations">{t("election.polling_stations.added", { num: pollingStations.length })}</li>
        )}
        {countingMethod && <li id="counting-method">{t(countingMethod)}</li>}
        {numberOfVoters && (
          <li id="number-of-voters">
            {formatNumber(numberOfVoters)} {t("voters")}
          </li>
        )}
      </ul>
    </>
  );
}
