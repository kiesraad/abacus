import { ApiError } from "@/api/ApiResult";
import { Alert, FormLayout } from "@/components/ui";
import { t } from "@/lib/i18n";

interface ApportionmentErrorProps {
  error: ApiError;
}

export function ApportionmentError({ error }: ApportionmentErrorProps) {
  const isError = error.reference === "ApportionmentNotAvailableUntilDataEntryFinalised";
  return (
    <FormLayout.Alert>
      <Alert type={isError ? "error" : "warning"}>
        <h2>{isError ? t("apportionment.not_yet_available") : t("apportionment.not_possible")}</h2>
        <p>{t(`error.api_error.${error.reference}`)}</p>
      </Alert>
    </FormLayout.Alert>
  );
}
