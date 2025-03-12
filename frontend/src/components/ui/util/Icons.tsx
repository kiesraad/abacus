import { AlertType, MenuStatus } from "@/components/ui";
import { t } from "@/lib/i18n";
import {
  IconArrowNarrowRight,
  IconCheckmark,
  IconError,
  IconInfo,
  IconMinus,
  IconPencil,
  IconThumbsUp,
  IconWarning,
} from "@/lib/icon";

export function renderIconForType(type: AlertType) {
  switch (type) {
    case "error":
      return <IconError aria-label={t("something_goes_wrong")} />;
    case "warning":
      return <IconWarning aria-label={t("pay_attention")} />;
    case "notify":
      return <IconInfo aria-label={t("for_your_information")} />;
    case "success":
      return <IconThumbsUp aria-label={t("success")} />;
  }
}

export function renderStatusIcon(status: MenuStatus) {
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
