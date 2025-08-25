import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";

export function InvestigationPrintCorrigendum() {
  return (
    <>
      <Button.Link to="../../../">{t("investigations.back_to_all_investigations")}</Button.Link>
    </>
  );
}
