import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";

export function InvestigationPrintCorrigendum() {
  const electionId = useNumericParam("electionId");
  const pollingStationId = useNumericParam("pollingStationId");

  return (
    <section className="md">
      <h2>{t("investigations.print_corrigendum")}</h2>
      <div className="mb-lg">
        {tx("investigations.print_corrigendum_instructions.download_and_print")}
        <DownloadButton
          icon="file"
          href="#" // TODO insert download URL
          title={t("investigations.download_corrigendum_link", { number: pollingStationId })}
          subtitle="Na 14-2 Bijlage 1"
        />
        {tx("investigations.print_corrigendum_instructions.after_download_and_print")}
      </div>
      <div className="mb-lg">{tx("investigations.print_corrigendum_instructions.conduct_investigation")}</div>
      <div className="mb-lg">{tx("investigations.print_corrigendum_instructions.after_the_investigation")}</div>
      <BottomBar type="form">
        <BottomBar.Row>
          <Button.Link size="lg" to={`/elections/${electionId}/investigations`}>
            {t("investigations.back_to_all_investigations")}
          </Button.Link>
          <Button size="lg" variant="secondary" /** TODO insert continue URL */>
            {t("investigations.continue_to_findings")}
          </Button>
        </BottomBar.Row>
      </BottomBar>
    </section>
  );
}
