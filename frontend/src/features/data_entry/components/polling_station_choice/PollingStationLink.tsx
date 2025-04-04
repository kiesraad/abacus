import { Link } from "react-router";

import { DataEntryStatusName, PollingStation } from "@/api";
import { IconArrowNarrowRight } from "@/lib/icon";
import { getUrlForDataEntry } from "@/lib/util";

import cls from "./PollingStationLink.module.css";

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
