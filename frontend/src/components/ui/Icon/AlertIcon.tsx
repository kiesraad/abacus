import { IconError, IconInfo, IconThumbsUp, IconWarning } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import { AlertType } from "@/types/ui";

export function AlertIcon({ type }: { type: AlertType }) {
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
