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

import { AlertType, MenuStatus } from "../ui.types";

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

export function renderStatusIcon(status: MenuStatus): React.JSX.Element {
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
