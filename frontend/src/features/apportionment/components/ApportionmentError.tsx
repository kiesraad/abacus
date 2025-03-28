import { ApiError } from "@/api";
import { Alert, FormLayout } from "@/components/ui";
import { t } from "@/lib/i18n";

interface ApportionmentErrorProps {
  error: ApiError;
}

export function ApportionmentError({ error }: ApportionmentErrorProps) {
  return (
    <FormLayout.Alert>
      <Alert type="error">
        <h2>
          {error.reference === "ApportionmentNotAvailableUntilDataEntryFinalised"
            ? t("apportionment.not_yet_available")
            : t("apportionment.not_possible")}
        </h2>
        <p>{t(`error.api_error.${error.reference}`)}</p>
      </Alert>
    </FormLayout.Alert>
  );
}
