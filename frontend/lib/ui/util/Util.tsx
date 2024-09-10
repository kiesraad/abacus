import { IconError, IconInfo, IconThumbsUp, IconWarning } from "@kiesraad/icon";
import { AlertType } from "@kiesraad/ui";

export function renderIconForType(type: AlertType) {
  switch (type) {
    case "error":
      return <IconError aria-label={"bevat een fout"} />;
    case "warning":
      return <IconWarning aria-label={"bevat een waarschuwing"} />;
    case "notify":
      return <IconInfo aria-label={"bevat een kennisgeving"} />;
    case "success":
      return <IconThumbsUp aria-label={"bevat een bevestiging"} />;
  }
}
