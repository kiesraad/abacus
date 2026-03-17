import { Link } from "react-router";

import { IconArrowRight } from "@/components/generated/icons";
import { Icon } from "@/components/ui/Icon/Icon";
import type { ElectionId, ElectionStatusResponseEntry } from "@/types/generated/openapi";
import { getUrlForDataEntry } from "../utils/util";
import cls from "./DataEntryHome.module.css";

interface DataEntryLinkProps {
  electionId: ElectionId;
  dataEntry: ElectionStatusResponseEntry;
}

export function DataEntryLink({ electionId, dataEntry }: DataEntryLinkProps) {
  return (
    <Link className={cls.link} to={getUrlForDataEntry(electionId, dataEntry)}>
      <span>
        <span className={cls.number}>{dataEntry.source.number}</span> - {dataEntry.source.name}
      </span>
      <Icon size="xs" color="link-default" icon={<IconArrowRight />} />
    </Link>
  );
}
