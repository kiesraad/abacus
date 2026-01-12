import {
  IconCheckHeart,
  IconCheckVerified,
  IconClock,
  IconHourglass,
  IconSettings,
} from "@/components/generated/icons";
import type { CommitteeSessionStatus } from "@/types/generated/openapi";
import type { Size } from "@/types/ui";

import { Icon } from "./Icon";

interface CommitteeSessionStatusIconProps {
  status: CommitteeSessionStatus;
  role?: "coordinator" | "typist";
  size?: Size;
}

export function CommitteeSessionStatusIcon({
  status,
  role = "coordinator",
  size = "md",
}: CommitteeSessionStatusIconProps) {
  switch (status) {
    case "created":
    case "in_preparation":
      return (
        <Icon
          size={size}
          color={role === "coordinator" ? "status-not-started" : "warning"}
          icon={role === "coordinator" ? <IconSettings /> : <IconClock />}
        />
      );
    case "data_entry":
      return <Icon size={size} color="accept" icon={<IconCheckHeart />} />;
    case "paused":
      return <Icon size={size} color="warning" icon={<IconHourglass />} />;
    case "completed":
      return <Icon size={size} color="default" icon={<IconCheckVerified />} />;
  }
}
