import { ApiError } from "@/api/ApiResult";
import { Alert } from "@/components/ui/Alert/Alert";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";

interface ApportionmentErrorProps {
  error: ApiError;
}

export function ApportionmentError({ error }: ApportionmentErrorProps) {
  const isError = error.reference === "ApportionmentNotAvailableUntilDataEntryFinalised";
  return (
    <FormLayout.Alert>
      <Alert type={isError ? "error" : "warning"}>
        <strong className="heading-md">
          {isError ? t("apportionment.not_yet_available") : t("apportionment.not_possible")}
        </strong>
        <p>{t(`error.api_error.${error.reference}`)}</p>
      </Alert>
    </FormLayout.Alert>
  );
}
