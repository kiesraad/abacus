import { HTMLAttributes, ReactNode } from "react";

import { CommitteeSessionStatusIcon } from "@/components/ui/Icon/CommitteeSessionStatusIcon";
import { CommitteeSession } from "@/types/generated/openapi";
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
        <span className={cls.date}>{date}</span>
      </div>
      {children}
      {button}
    </div>
  );
}

export interface CommitteeSessionCardProps {
  committeeSession: CommitteeSession;
}

export function CommitteeSessionCard({ committeeSession, ...props }: CommitteeSessionCardProps & DivProps) {
  const icon = CommitteeSessionStatusIcon({ status: committeeSession.status, size: "xl" });
  const label = committeeSessionLabel(committeeSession.number);
  const status = CommitteeSessionStatusLabel(committeeSession.status, "coordinator");
  const date = committeeSession.start_date
    ? formatFullDateWithoutTimezone(new Date(committeeSession.start_date))
    : "testetsttes";
  // TODO: Add correct children to each card
  switch (committeeSession.status) {
    case "created":
      return <Card icon={icon} label={label} status={status} date={date} {...props}></Card>;
    case "data_entry_not_started":
      return <Card icon={icon} label={label} status={status} date={date} {...props}></Card>;
    case "data_entry_in_progress":
      return <Card icon={icon} label={label} status={status} date={date} {...props}></Card>;
    case "data_entry_paused":
      return <Card icon={icon} label={label} status={status} date={date} {...props}></Card>;
    case "data_entry_finished":
      return <Card icon={icon} label={label} status={status} date={date} {...props}></Card>;
  }
}
