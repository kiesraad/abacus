import { Button } from "@/components/ui/Button/Button";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout.tsx";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";

export function InvestigationPrintCorrigendum() {
  const electionId = useNumericParam("electionId");
  const pollingStationId = useNumericParam("pollingStationId");

  return (
    <Form title={t("investigations.print_corrigendum")}>
      <FormLayout>
        <FormLayout.Section>
          <section className="sm">
            <ul className="mt-0">
              <li>{tx("investigations.print_corrigendum_instructions.download_and_print")}</li>
              <li>{tx("investigations.print_corrigendum_instructions.print_recommendation")}</li>
            </ul>
            <DownloadButton
              icon="download"
              href="#" // TODO insert download URL
              title={t("investigations.download_corrigendum_link", { number: pollingStationId })}
              subtitle="Na 14-2 Bijlage 1"
            />
            <ul className="mb-0">
              <li>{t("investigations.print_corrigendum_instructions.corrigendum_explanation")}</li>
              <li>{t("investigations.print_corrigendum_instructions.more_investigations")}</li>
            </ul>
          </section>
        </FormLayout.Section>
        <FormLayout.Section title={t("investigations.print_corrigendum_instructions.conduct_investigation")}>
          <section className="sm">
            <ul className="mt-0 mb-0">
              <li>{t("investigations.print_corrigendum_instructions.investigate_results")}</li>
              <li>{t("investigations.print_corrigendum_instructions.recount_needed")}</li>
            </ul>
          </section>
        </FormLayout.Section>
        <FormLayout.Section title={t("investigations.print_corrigendum_instructions.after_the_investigation")}>
          <section className="sm">
            <ul className="mt-0 mb-0">
              <li>{t("investigations.print_corrigendum_instructions.add_the_findings")}</li>
              <li>{t("investigations.print_corrigendum_instructions.indicate_new_result")}</li>
              <li>{t("investigations.print_corrigendum_instructions.if_new_result")}</li>
            </ul>
          </section>
        </FormLayout.Section>
        <FormLayout.Controls>
          <Button.Link size="lg" to={`/elections/${electionId}/investigations`}>
            {t("investigations.back_to_all_investigations")}
          </Button.Link>
          <Button type="button" size="lg" variant="secondary" /** TODO insert continue URL */>
            {t("investigations.continue_to_findings")}
          </Button>
        </FormLayout.Controls>
      </FormLayout>
    </Form>
  );
}
