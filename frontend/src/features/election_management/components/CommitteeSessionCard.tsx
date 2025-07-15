import { Fragment, HTMLAttributes, ReactNode } from "react";
import { To, useNavigate } from "react-router";

import { CommitteeSessionStatusLabel } from "@/components/committee_session/CommitteeSessionStatus";
import { Button } from "@/components/ui/Button/Button";
import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { t } from "@/i18n/translate";
import { CommitteeSession } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatFullDateWithoutTimezone } from "@/utils/format";

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
              void navigate(buttonLink.to);
            }}
          >
            <span className={cn(firstRowBold && index === 0 && "font-bold")}>{buttonLink.label}</span>
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
  const icon = CommitteeSessionStatusIcon({ status: committeeSession.status, size: "xl" });
  const label = committeeSessionLabel(committeeSession.number);
  const status = CommitteeSessionStatusLabel(committeeSession.status, "coordinator");
  const date = committeeSession.start_date
    ? `${formatFullDateWithoutTimezone(new Date(committeeSession.start_date))} ${committeeSession.start_time}`
    : undefined;
  const buttonLinks: ButtonLink[] = [];
  let button = undefined;
  switch (committeeSession.status) {
    case "created":
      if (committeeSession.number > 1) {
        buttonLinks.push({ id: committeeSession.id, label: t("election_management.select_polling_stations"), to: "" }); // TODO: issue #1716 add link
      }
      break;
    case "data_entry_not_started":
      break;
    case "data_entry_in_progress":
      button = (
        <Button.Link variant="primary" size="sm" to="status">
          {t("election_management.view_progress")}
        </Button.Link>
      );
      break;
    case "data_entry_paused":
      break;
    case "data_entry_finished":
      buttonLinks.push({
        id: committeeSession.id,
        label: t("election_management.results_and_documents"),
        to: "report", // TODO: change link when reports are linked to committee sessions
      });
      if (currentSession) {
        buttonLinks.push({ id: committeeSession.id, label: t("election_management.view_data_entry"), to: "status" });
      }
      break;
  }
  buttonLinks.push({ id: committeeSession.id, label: t("election_management.committee_session_details"), to: "" }); // TODO: issue #1750 add link

  return (
    <Card icon={icon} label={label} status={status} date={date} button={button} {...props}>
      {buttonLinks.length > 0 && <ButtonLinkList buttonLinks={buttonLinks} firstRowBold={currentSession} />}
    </Card>
  );
}
