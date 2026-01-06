import {
  IconArrowNarrowRight,
  IconCheckmark,
  IconEdit,
  IconError,
  IconMinus,
  IconWarning,
} from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import type { MenuStatus } from "@/types/ui";

export function StatusIcon({ status }: { status: MenuStatus }) {
  switch (status) {
    case "active":
      return <IconArrowNarrowRight aria-label={t("you_are_here")} aria-hidden="false" />; // "Actief"
    case "accept":
      return <IconCheckmark aria-label={t("saved")} aria-hidden="false" />; // "Ingevoerd"
    case "warning":
      return <IconWarning aria-label={t("contains_warning")} aria-hidden="false" />; // "Ingevoerd, met openstaande waarschuwingen"
    case "empty":
      return <IconMinus aria-label={t("empty")} aria-hidden="false" />; // "Geen invoer gedaan"
    case "unsaved":
      return <IconEdit aria-label={t("not_yet_finished")} aria-hidden="false" />; // "Niet opgeslagen wijzigingen"
    case "error":
      return <IconError aria-label={t("contains_error")} aria-hidden="false" />; // "Ingevoerd, met openstaande fouten"
    default:
      return null;
  }
}
