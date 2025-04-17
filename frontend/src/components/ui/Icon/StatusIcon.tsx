import {
  IconArrowNarrowRight,
  IconCheckmark,
  IconError,
  IconMinus,
  IconPencil,
  IconWarning,
} from "@/components/generated/icons";
import { MenuStatus } from "@/types/ui";

import { t } from "@kiesraad/i18n";

export function StatusIcon({ status }: { status: MenuStatus }) {
  switch (status) {
    case "active":
      return <IconArrowNarrowRight aria-label={t("you_are_here")} />; // "Actief"
    case "accept":
      return <IconCheckmark aria-label={t("saved")} />; // "Ingevoerd"
    case "warning":
      return <IconWarning aria-label={t("contains_warning")} />; // "Ingevoerd, met openstaande waarschuwingen"
    case "empty":
      return <IconMinus aria-label={t("empty")} />; // "Geen invoer gedaan"
    case "unsaved":
      return <IconPencil aria-label={t("not_yet_finished")} />; // "Niet opgeslagen wijzigingen"
    case "error":
      return <IconError aria-label={t("contains_error")} />; // "Ingevoerd, met openstaande fouten"
    default:
      return <></>;
  }
}
