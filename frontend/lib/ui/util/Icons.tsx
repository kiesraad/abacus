import { ElectionStatus } from "@kiesraad/api";
import {
  IconArrowNarrowRight,
  IconCheckHeart,
  IconCheckmark,
  IconCheckVerified,
  IconError,
  IconInfo,
  IconLock,
  IconMinus,
  IconPencil,
  IconThumbsUp,
  IconWarning,
} from "@kiesraad/icon";
import { AlertType, Icon, MenuStatus } from "@kiesraad/ui";

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

export function getIconForElectionStatus(status: ElectionStatus): React.JSX.Element {
  switch (status) {
    case "DataEntryInProgress":
      return <Icon size="md" color="accept" icon={<IconCheckHeart />} />;
    case "FinishDataEntry":
      return <Icon size="md" color="error" icon={<IconLock />} />;
    case "DataEntryFinished":
      return <Icon size="md" color="default" icon={<IconCheckVerified />} />;
    default:
      return <></>;
  }
}
