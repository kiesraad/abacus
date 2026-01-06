import { IconError, IconInfo, IconThumbsUp, IconWarning } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import type { AlertType } from "@/types/ui";

export function AlertIcon({ type }: { type: AlertType }) {
  switch (type) {
    case "error":
      return <IconError aria-label={t("something_goes_wrong")} aria-hidden="false" />;
    case "warning":
      return <IconWarning aria-label={t("pay_attention")} aria-hidden="false" />;
    case "notify":
      return <IconInfo aria-label={t("for_your_information")} aria-hidden="false" />;
    case "success":
      return <IconThumbsUp aria-label={t("success")} aria-hidden="false" />;
  }
}
