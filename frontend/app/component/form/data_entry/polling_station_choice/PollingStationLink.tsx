import { Link } from "react-router-dom";

import { PollingStation, PollingStationStatus } from "@kiesraad/api";
import { IconArrowNarrowRight } from "@kiesraad/icon";
import { getUrlForDataEntry } from "@kiesraad/util";

import cls from "./PollingStationLink.module.css";

interface PollingStationLinkProps {
  pollingStation: PollingStation;
  status: PollingStationStatus;
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
