import {
  IconArrowNarrowRight,
  IconCheckmark,
  IconError,
  IconInfo,
  IconMinus,
  IconPencil,
  IconThumbsUp,
  IconWarning,
} from "@kiesraad/icon";
import { AlertType, MenuStatus } from "@kiesraad/ui";

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

export function renderStatusIcon(status: MenuStatus) {
  switch (status) {
    case "active":
      return <IconArrowNarrowRight aria-label={"je bent hier"} />; // "Actief"
    case "accept":
      return <IconCheckmark aria-label={"opgeslagen"} />; // "Ingevoerd"
    case "warning":
      return <IconWarning aria-label={"bevat een waarschuwing"} />; // "Ingevoerd, met openstaande waarschuwingen"
    case "empty":
      return <IconMinus aria-label={"leeg"} />; // "Geen invoer gedaan"
    case "unsaved":
      return <IconPencil aria-label={"nog niet afgerond"} />; // "Niet opgeslagen wijzigingen"
    case "error":
      return <IconError aria-label={"bevat een fout"} />; // "Ingevoerd, met openstaande fouten"
    default:
      return <></>;
  }
}
