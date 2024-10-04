import { Link } from "react-router-dom";

import { PollingStation } from "@kiesraad/api";
import { IconArrowNarrowRight } from "@kiesraad/icon";

import cls from "./PollingStationLink.module.css";

interface PollingStationLinkProps {
  pollingStation: PollingStation;
}

export function PollingStationLink({ pollingStation }: PollingStationLinkProps) {
  return (
    <p>
      <Link className={cls.link} to={pollingStation.id.toString()}>
        <span className={cls.number}>{pollingStation.number}</span>
        {" - "}
        <span>{pollingStation.name}</span>
        <IconArrowNarrowRight className={cls.icon} width="21px" height="21px" />
      </Link>
    </p>
  );
}
