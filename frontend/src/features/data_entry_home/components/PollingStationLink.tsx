import { Link } from "react-router";

import { IconArrowRight } from "@/components/generated/icons";
import { Icon } from "@/components/ui/Icon/Icon";
import type { DataEntryStatusName, PollingStation } from "@/types/generated/openapi";
import { getUrlForDataEntry } from "../utils/util";
import cls from "./PollingStationChoice.module.css";

interface PollingStationLinkProps {
  pollingStation: PollingStation;
  status: DataEntryStatusName;
}

export function PollingStationLink({ pollingStation, status }: PollingStationLinkProps) {
  return (
    <Link className={cls.link} to={getUrlForDataEntry(pollingStation.election_id, pollingStation.id, status)}>
      <span>
        <span className={cls.number}>{pollingStation.number}</span> - {pollingStation.name}
      </span>
      <Icon size="xs" color="link-default" icon={<IconArrowRight />} />
    </Link>
  );
}
