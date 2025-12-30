import { Link } from "react-router";

import { IconArrowNarrowRight } from "@/components/generated/icons";
import type { DataEntryStatusName, PollingStation } from "@/types/generated/openapi";

import { getUrlForDataEntry } from "../utils/util";
import cls from "./PollingStationChoice.module.css";

interface PollingStationLinkProps {
  pollingStation: PollingStation;
  status: DataEntryStatusName;
}

export function PollingStationLink({ pollingStation, status }: PollingStationLinkProps) {
  return (
    <p>
      <Link className={cls.link} to={getUrlForDataEntry(pollingStation.election_id, pollingStation.id, status)}>
        <span className={cls.number}>{pollingStation.number}</span>
        {" - "}
        <span>{pollingStation.name}</span>
        <IconArrowNarrowRight className={cls.icon} width="21px" height="21px" />
      </Link>
    </p>
  );
}
