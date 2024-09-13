import { IconError, IconInfo, IconThumbsUp, IconWarning } from "@kiesraad/icon";
import { AlertType } from "@kiesraad/ui";

export function renderIconForType(type: AlertType) {
  switch (type) {
    case "error":
      return <IconError aria-label={"Er gaat iets fout"} />;
    case "warning":
      return <IconWarning aria-label={"Let op"} />;
    case "notify":
      return <IconInfo aria-label={"Ter info"} />;
    case "success":
      return <IconThumbsUp aria-label={"Gelukt!"} />;
  }
}
