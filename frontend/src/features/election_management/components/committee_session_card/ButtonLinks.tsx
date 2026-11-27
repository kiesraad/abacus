import { Fragment } from "react";
import { type NavigateOptions, type To, useNavigate } from "react-router";
import { useApportionmentStateRequest } from "@/hooks/apportionment/useApportionmentStateRequest";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import type { CommitteeSession, CommitteeSessionId } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import cls from "./CommitteeSessionCard.module.css";

export type ButtonLinksProps = {
  committeeSession: CommitteeSession;
  isCurrentSession: boolean;
};

export function ButtonLinksGSB({ committeeSession, isCurrentSession }: ButtonLinksProps) {
  const buttonLinks: ButtonLink[] = [];
  const isNextSession = committeeSession.number > 1;
  const { isCoordinator } = useUserRole();

  const addIf = (item: ButtonLink, condition: boolean) => {
    if (condition) {
      buttonLinks.push(item);
    }
  };

  switch (committeeSession.status) {
    case "created":
      addIf(investigationsButtonLink(committeeSession.id), isCurrentSession && isNextSession);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      addIf(deleteButtonLink(committeeSession.id), isCurrentSession && isCoordinator && isNextSession);
      break;
    case "in_preparation":
      addIf(investigationsButtonLink(committeeSession.id), isCurrentSession && isNextSession);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      addIf(deleteButtonLink(committeeSession.id), isCurrentSession && isCoordinator && isNextSession);
      break;
    case "data_entry":
      addIf(investigationsButtonLink(committeeSession.id), isCurrentSession && isNextSession);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      break;
    case "paused":
      addIf(resumeButtonLink(committeeSession.id, isCoordinator), isCurrentSession);
      addIf(investigationsButtonLink(committeeSession.id), isCurrentSession && isNextSession);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      break;
    case "completed":
      addIf(downloadButtonLink(committeeSession.id), isCoordinator);
      addIf(investigationsButtonLink(committeeSession.id), isCurrentSession && isNextSession);
      addIf(viewDataEntryButtonLink(committeeSession.id), isCurrentSession);
      break;
  }

  if (buttonLinks.length === 0) return undefined;

  return <ButtonLinkList links={buttonLinks} firstRowBold={isCurrentSession} />;
}

export function ButtonLinksHSB({ committeeSession }: ButtonLinksProps) {
  const buttonLinks: ButtonLink[] = [];
  const { isCoordinator, isAdministrator } = useUserRole();

  const addIf = (item: ButtonLink, condition: boolean) => {
    if (condition) {
      buttonLinks.push(item);
    }
  };

  switch (committeeSession.status) {
    case "created":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "in_preparation":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "data_entry":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "paused":
      addIf(resumeButtonLink(committeeSession.id, isCoordinator), true);
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "completed":
      addIf(downloadButtonLink(committeeSession.id), isCoordinator);
      addIf(viewDataEntryButtonLink(committeeSession.id), true);
      break;
  }

  if (buttonLinks.length === 0) return undefined;

  return <ButtonLinkList links={buttonLinks} firstRowBold={true} />;
}

export function ButtonLinksCSB({ committeeSession }: ButtonLinksProps) {
  const buttonLinks: ButtonLink[] = [];
  const { isCoordinator, isAdministrator } = useUserRole();

  const { requestState } = useApportionmentStateRequest(committeeSession.election_id);
  const apportionmentFinalised = requestState.status === "success" && requestState.data.type === "Finalised";

  const addIf = (item: ButtonLink, condition: boolean) => {
    if (condition) {
      buttonLinks.push(item);
    }
  };

  switch (committeeSession.status) {
    case "created":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "in_preparation":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "data_entry":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "paused":
      addIf(resumeButtonLink(committeeSession.id, isCoordinator), true);
      addIf(subCommitteeKeysButtonLink(committeeSession.id), isAdministrator);
      addIf(detailsButtonLink(committeeSession.id), isCoordinator);
      break;
    case "completed":
      addIf(downloadButtonLink(committeeSession.id), isCoordinator && apportionmentFinalised);
      addIf(apportionmentButtonLink(committeeSession.id), isCoordinator);
      addIf(viewDataEntryButtonLink(committeeSession.id), true);
      break;
  }

  if (buttonLinks.length === 0) return undefined;

  return <ButtonLinkList links={buttonLinks} firstRowBold={true} />;
}

export interface ButtonLink {
  id: number;
  label: string;
  to: To;
  options?: NavigateOptions;
}

export function ButtonLinkList({ links, firstRowBold }: { links: ButtonLink[]; firstRowBold: boolean }) {
  const navigate = useNavigate();
  return (
    <div className={cls.buttonLinks}>
      {links.map((buttonLink, index) => (
        <Fragment key={`${buttonLink.id}-${buttonLink.label}`}>
          {index !== 0 && <div className={cls.border}></div>}
          <button
            type="button"
            onClick={() => {
              void navigate(buttonLink.to, buttonLink.options || {});
            }}
          >
            <span className={cn(firstRowBold && index === 0 && "bold")}>{buttonLink.label}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}

const detailsButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.committee_session_details"),
    to: "details",
  };
};

const investigationsButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.requested_investigations"),
    to: "investigations",
  };
};

const deleteButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.delete_session"),
    to: ".",
    options: { state: { showDeleteModal: true } },
  };
};

const resumeButtonLink: (committeeSessionId: CommitteeSessionId, isCoordinator: boolean) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
  isCoordinator: boolean,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: isCoordinator ? t("election_management.resume_or_check_progress") : t("view_progress"),
    to: "status",
  };
};

const downloadButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.results_and_documents"),
    to: `report/committee-session/${committeeSessionId}/download`,
  };
};

const viewDataEntryButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.view_data_entry"),
    to: "status",
  };
};

const subCommitteeKeysButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("election_management.import_sub_committee_keys"),
    to: "sub-committees",
  };
};

const apportionmentButtonLink: (committeeSessionId: CommitteeSessionId) => ButtonLink = (
  committeeSessionId: CommitteeSessionId,
): ButtonLink => {
  return {
    id: committeeSessionId,
    label: t("apportionment.title"),
    to: "apportionment",
  };
};
