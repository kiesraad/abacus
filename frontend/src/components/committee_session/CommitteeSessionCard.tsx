import { HTMLAttributes, ReactNode } from "react";
import { To } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { Table } from "@/components/ui/Table/Table";
import { t } from "@/i18n/translate";
import { CommitteeSession } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { committeeSessionLabel } from "@/utils/committeeSession";
import { formatFullDateWithoutTimezone } from "@/utils/format";

import cls from "./CommitteeSession.module.css";
import { CommitteeSessionStatusLabel } from "./CommitteeSessionStatus";

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
  label: string;
  to: To;
}

function ButtonLinkList(buttonLinks: ButtonLink[], firstRowBold: boolean) {
  return (
    <Table className="buttonLinks">
      <Table.Body>
        {buttonLinks.map((buttonLink, index) => (
          <Table.LinkRow key={index} to={buttonLink.to}>
            <Table.Cell className={cn(firstRowBold && index === 0 && "font-bold")}>{buttonLink.label}</Table.Cell>
          </Table.LinkRow>
        ))}
      </Table.Body>
    </Table>
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
        buttonLinks.push({ label: t("election_management.select_polling_stations"), to: "" }); // TODO: issue #1716 add link
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
      buttonLinks.push({ label: t("election_management.results_and_documents"), to: "report" }); // TODO: change link when reports are linked to committee sessions
      if (currentSession) {
        buttonLinks.push({ label: t("election_management.view_data_entry"), to: "status" });
      }
      break;
  }
  if (committeeSession.start_date === "" || committeeSession.start_time === "" || committeeSession.location === "") {
    buttonLinks.push({ label: t("election_management.committee_session_details"), to: "" }); // TODO: issue #1750 add link
  }
  return (
    <Card icon={icon} label={label} status={status} date={date} button={button} {...props}>
      {buttonLinks.length > 0 && ButtonLinkList(buttonLinks, currentSession)}
    </Card>
  );
}
