import { Button } from "@/components/ui/Button/Button";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t, tx } from "@/i18n/translate";

export function InvestigationPrintCorrigendum() {
  const pollingStationId = useNumericParam("pollingStationId");

  return (
    <section className="md">
      <h2>{t("investigations.print_corrigendum")}</h2>
      {tx("investigations.print_corrigendum_instructions", {
        download: () => (
          <DownloadButton
            icon="file"
            href="#" // TODO insert correct download URL
            title={t("investigations.download_corrigendum_link", { number: pollingStationId })}
            subtitle="Na 14-2 Bijlage 1"
          />
        ),
      })}
      <nav className="mt-xl">
        <Button.Link size="lg" to="../../../">
          {t("investigations.back_to_all_investigations")}
        </Button.Link>
      </nav>
    </section>
  );
}
