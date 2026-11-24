import { t } from "@/i18n/translate";
import type { CommitteeSessionId } from "@/types/generated/openapi";
import type { ButtonLink } from "./CommitteeSessionCard";

export const detailsButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.committee_session_details"),
    to: "details",
  };
};

export const investigationsButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.requested_investigations"),
    to: "investigations",
  };
};

export const deleteButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.delete_session"),
    to: ".",
    options: { state: { showDeleteModal: true } },
  };
};

export const resumeButtonLink: (committeeSessionId: CommitteeSessionId, isCoordinator: boolean) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
  isCoordinator: boolean,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: isCoordinator ? t("election_management.resume_or_check_progress") : t("view_progress"),
    to: "status",
  };
};

export const downloadButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.results_and_documents"),
    to: `report/committee-session/${committeeSessionId}/download`,
  };
};

export const viewDataEntryButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.view_data_entry"),
    to: "status",
  };
};

export const subCommitteeKeysButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.import_sub_committee_keys"),
    to: "sub-committees",
  };
};

export const apportionmentButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("apportionment.title"),
    to: "apportionment",
  };
};
