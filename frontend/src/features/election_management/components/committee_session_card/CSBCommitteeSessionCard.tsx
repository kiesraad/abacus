import type { ReactElement } from "react";
import { useNavigate } from "react-router";
import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import type {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  CommitteeSession,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatDateTimeFullWithoutWeekday } from "@/utils/dateTime";
import {
  apportionmentButtonLink,
  detailsButtonLink,
  downloadButtonLink,
  resumeButtonLink,
  subCommitteeKeysButtonLink,
  viewDataEntryButtonLink,
} from "./buttonLinks";
import {
  type ButtonLink,
  ButtonLinkList,
  Card,
  type CommitteeSessionCardProps,
  type DivProps,
} from "./CommitteeSessionCard";

function getButtonLinks(committeeSession: CommitteeSession, isCoordinator: boolean, isCurrentSession: boolean) {
  const buttonLinks: ButtonLink[] = [];
  const showSubCommitteeKeys = isCurrentSession && !isCoordinator;

  const addIf = (item: ButtonLink, condition: boolean) => {
    if (condition) {
      buttonLinks.push(item);
    }
  };

  switch (committeeSession.status) {
    case "created":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), showSubCommitteeKeys);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      break;
    case "in_preparation":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), showSubCommitteeKeys);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      break;
    case "data_entry":
      addIf(subCommitteeKeysButtonLink(committeeSession.id), showSubCommitteeKeys);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      break;
    case "paused":
      addIf(resumeButtonLink(committeeSession.id, isCoordinator), isCurrentSession);
      addIf(subCommitteeKeysButtonLink(committeeSession.id), showSubCommitteeKeys);
      addIf(detailsButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      break;
    case "completed":
      addIf(downloadButtonLink(committeeSession.id), isCoordinator);
      addIf(apportionmentButtonLink(committeeSession.id), isCurrentSession && isCoordinator);
      addIf(viewDataEntryButtonLink(committeeSession.id), isCurrentSession);
      break;
  }
  return buttonLinks;
}

export function CSBCommitteeSessionCard({
  committeeSession,
  isCurrentSession,
  committeeCategory,
  ...props
}: CommitteeSessionCardProps & DivProps) {
  const navigate = useNavigate();
  const { isCoordinator } = useUserRole();
  const updatePath: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${committeeSession.election_id}/committee_sessions/${committeeSession.id}/status`;
  const { update } = useCrud({ updatePath, throwAllErrors: true });

  function handleStart() {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry" };
    void update(body).then((result) => {
      if (isSuccess(result)) {
        void navigate("status");
      }
    });
  }

  const date = committeeSession.start_date_time
    ? formatDateTimeFullWithoutWeekday(new Date(committeeSession.start_date_time))
    : undefined;
  let cardButton: ReactElement | undefined;
  if (committeeSession.status === "in_preparation" && isCurrentSession && isCoordinator) {
    cardButton = (
      <Button size="sm" onClick={handleStart}>
        {t("election_management.start_data_entry")}
      </Button>
    );
  } else if (committeeSession.status === "data_entry" && isCurrentSession) {
    cardButton = (
      <Button.Link size="sm" to="status">
        {t("view_progress")}
      </Button.Link>
    );
  }
  const buttonLinks: ButtonLink[] = getButtonLinks(committeeSession, isCoordinator, isCurrentSession);

  return (
    <Card
      icon={CommitteeSessionStatusIcon({ status: committeeSession.status, size: "xl" })}
      label={committeeSessionLabel(committeeCategory, committeeSession.number)}
      status={t(`committee_session_status.coordinator.${committeeSession.status}`)}
      date={date}
      button={cardButton}
      id={`session-${committeeSession.number}`}
      {...props}
    >
      {buttonLinks.length > 0 && (
        <ButtonLinkList buttonLinks={buttonLinks} firstRowBold={isCurrentSession && cardButton === undefined} />
      )}
    </Card>
  );
}
