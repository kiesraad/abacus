import { IconError, IconInfo, IconThumbsUp, IconWarning } from "@kiesraad/icon";
import { AlertType } from "@kiesraad/ui";

export function renderIconForType(type: AlertType) {
  switch (type) {
    case "error":
      return <IconError />;
    case "warning":
      return <IconWarning />;
    case "notify":
      return <IconInfo />;
    case "success":
      return <IconThumbsUp />;
  }
}
