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
  CommitteeCategory,
  CommitteeSession,
} from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatDateTimeFullWithoutWeekday } from "@/utils/dateTime";
import { ButtonLinksCSB, ButtonLinksGSB, type ButtonLinksProps } from "./ButtonLinks";
import cls from "./CommitteeSessionCard.module.css";

export interface CommitteeSessionCardProps {
  committeeCategory: CommitteeCategory;
  committeeSession: CommitteeSession;
  isCurrentSession: boolean;
}

export function CommitteeSessionCard({
  committeeSession,
  committeeCategory,
  isCurrentSession,
}: CommitteeSessionCardProps) {
  const date = committeeSession.start_date_time
    ? formatDateTimeFullWithoutWeekday(new Date(committeeSession.start_date_time))
    : undefined;
  const props: ButtonLinksProps = { committeeSession, isCurrentSession };

  return (
    <div className={cls.card} id={`session-${committeeSession.number}`}>
      {CommitteeSessionStatusIcon({ status: committeeSession.status, size: "xl" })}
      <div className={cls.labelStatusDateSection}>
        <p>
          <b>{committeeSessionLabel(committeeCategory, committeeSession.number)}</b> —{" "}
          {t(`committee_session_status.coordinator.${committeeSession.status}`)}
        </p>
        {date && (
          <span className={cls.date}>
            {t("election_management.began_on")} {date}
          </span>
        )}
      </div>
      {renderButtonLinks(committeeCategory, props)}
      <CardButton committeeSession={committeeSession} isCurrentSession={isCurrentSession} />
    </div>
  );
}

function renderButtonLinks(committeeCategory: CommitteeCategory, props: ButtonLinksProps) {
  switch (committeeCategory) {
    case "CSB":
      return <ButtonLinksCSB {...props} />;
    case "GSB":
      return <ButtonLinksGSB {...props} />;
  }
}

function CardButton({
  committeeSession,
  isCurrentSession,
}: {
  committeeSession: CommitteeSession;
  isCurrentSession: boolean;
}): ReactElement | undefined {
  const { isCoordinator } = useUserRole();
  const navigate = useNavigate();

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

  if (committeeSession.status === "in_preparation" && isCurrentSession && isCoordinator) {
    return (
      <Button size="sm" onClick={handleStart}>
        {t("election_management.start_data_entry")}
      </Button>
    );
  } else if (committeeSession.status === "data_entry" && isCurrentSession) {
    return (
      <Button.Link size="sm" to="status">
        {t("view_progress")}
      </Button.Link>
    );
  }
  return undefined;
}
