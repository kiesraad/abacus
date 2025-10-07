import { Fragment, HTMLAttributes, ReactNode } from "react";
import { NavigateOptions, To, useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { CommitteeSessionStatusLabel } from "@/components/committee_session/CommitteeSessionStatus";
import { Button } from "@/components/ui/Button/Button";
import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
  CommitteeSession,
} from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatFullDateTimeWithoutTimezone } from "@/utils/dateTime";

import cls from "./CommitteeSessionCard.module.css";

export type DivProps = HTMLAttributes<HTMLDivElement>;

export interface CardProps {
  icon: ReactNode;
  label: string;
  status: string;
  date?: string;
  button?: ReactNode;
  children?: ReactNode;
}

function Card({ icon, label, status, date, button, children, ...props }: CardProps & DivProps) {
  return (
    <div className={cls.card} {...props}>
      {icon}
      <div className={cls.labelStatusDateSection}>
        <p>
          <b>{label}</b> — {status}
        </p>
        {date && <span className={cn(cls.date, "capitalize-first")}>{date}</span>}
      </div>
      {children}
      {button}
    </div>
  );
}

export interface ButtonLink {
  id: number;
  label: string;
  to: To;
  options?: NavigateOptions;
}

export interface ButtonLinkListProps {
  buttonLinks: ButtonLink[];
  firstRowBold: boolean;
}

function ButtonLinkList({ buttonLinks, firstRowBold }: ButtonLinkListProps) {
  const navigate = useNavigate();
  return (
    <div className={cls.buttonLinks}>
      {buttonLinks.map((buttonLink, index) => (
        <Fragment key={`${buttonLink.id}-${buttonLink.label}`}>
          {index !== 0 && <div className={cls.border}></div>}
          <button
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

export interface CommitteeSessionCardProps {
  committeeSession: CommitteeSession;
  currentSession: boolean;
}

export function CommitteeSessionCard({
  committeeSession,
  currentSession,
  ...props
}: CommitteeSessionCardProps & DivProps) {
  const navigate = useNavigate();
  const { isCoordinator } = useUserRole();
  const updatePath: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${committeeSession.id}/status`;
  const { update } = useCrud({ updatePath, throwAllErrors: true });

  function handleStart() {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_in_progress" };
    void update(body).then((result) => {
      if (isSuccess(result)) {
        void navigate("status");
      }
    });
  }

  const icon = CommitteeSessionStatusIcon({ status: committeeSession.status, size: "xl" });
  const label = committeeSessionLabel(committeeSession.number);
  const status = CommitteeSessionStatusLabel(committeeSession.status, "coordinator");
  const date = committeeSession.start_date_time
    ? formatFullDateTimeWithoutTimezone(new Date(committeeSession.start_date_time))
    : undefined;
  const buttonLinks: ButtonLink[] = [];
  let button = undefined;

  const detailsButtonLink: ButtonLink = {
    id: committeeSession.id,
    label: t("election_management.committee_session_details"),
    to: "details",
  };

  const investigationsButtonLink: ButtonLink = {
    id: committeeSession.id,
    label: t("election_management.requested_investigations"),
    to: "investigations",
  };

  const deleteButtonLink: ButtonLink = {
    id: committeeSession.id,
    label: t("election_management.delete_session"),
    to: ".",
    options: { state: { showDeleteModal: true } },
  };

  switch (committeeSession.status) {
    case "created":
      if (currentSession && committeeSession.number > 1) {
        buttonLinks.push(investigationsButtonLink);
      }
      if (isCoordinator && currentSession) {
        buttonLinks.push(detailsButtonLink);
        if (committeeSession.number > 1) {
          buttonLinks.push(deleteButtonLink);
        }
      }
      break;
    case "data_entry_not_started":
      if (currentSession && committeeSession.number > 1) {
        buttonLinks.push(investigationsButtonLink);
      }
      if (isCoordinator && currentSession) {
        buttonLinks.push(detailsButtonLink);
        if (committeeSession.number > 1) {
          buttonLinks.push(deleteButtonLink);
        }
      }
      if (isCoordinator) {
        button = (
          <Button size="sm" onClick={handleStart}>
            {t("election_management.start_data_entry")}
          </Button>
        );
      }
      break;
    case "data_entry_in_progress":
      if (currentSession && committeeSession.number > 1) {
        buttonLinks.push(investigationsButtonLink);
      }
      if (isCoordinator && currentSession) {
        buttonLinks.push(detailsButtonLink);
      }
      button = (
        <Button.Link size="sm" to="status">
          {t("view_progress")}
        </Button.Link>
      );
      break;
    case "data_entry_paused":
      if (currentSession && committeeSession.number > 1) {
        buttonLinks.push(investigationsButtonLink);
      }
      buttonLinks.push({
        id: committeeSession.id,
        label: isCoordinator ? t("election_management.resume_or_check_progress") : t("view_progress"),
        to: "status",
      });
      if (isCoordinator && currentSession) {
        buttonLinks.push(detailsButtonLink);
      }
      break;
    case "data_entry_finished":
      if (isCoordinator) {
        buttonLinks.push({
          id: committeeSession.id,
          label: t("election_management.results_and_documents"),
          to: `report/committee-session/${committeeSession.id}/download`,
        });
      }
      if (currentSession) {
        buttonLinks.push({ id: committeeSession.id, label: t("election_management.view_data_entry"), to: "status" });
      }
      break;
  }

  return (
    <Card
      icon={icon}
      label={label}
      status={status}
      date={date}
      button={button}
      id={`session-${committeeSession.number}`}
      {...props}
    >
      {buttonLinks.length > 0 && (
        <ButtonLinkList buttonLinks={buttonLinks} firstRowBold={currentSession && button === undefined} />
      )}
    </Card>
  );
}
