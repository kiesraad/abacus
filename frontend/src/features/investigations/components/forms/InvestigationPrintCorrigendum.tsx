import { useState } from "react";
import { MissingCommitteeSessionDetailsModal } from "@/components/committee_session/MissingCommitteeSessionDetailsModal";
import { Button } from "@/components/ui/Button/Button";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";
import { committeeSessionDetailsPresent } from "@/utils/committeeSession";
import { directDownload } from "@/utils/download";

interface InvestigationPrintCorrigendumProps {
  pollingStationId: number;
}

export function InvestigationPrintCorrigendum({ pollingStationId }: InvestigationPrintCorrigendumProps) {
  const { currentCommitteeSession, election, pollingStation } = useElection(pollingStationId);
  const [showMissingCommitteeSessionDetailsModal, setShowMissingCommitteeSessionDetailsModal] = useState(false);

  if (!pollingStation) {
    return <Loader />;
  }

  return (
    <>
      <Form title={t("investigations.print_corrigendum.title")}>
        <FormLayout>
          <FormLayout.Section>
            <section className="sm">
              <ul className="mt-0">
                <li>{tx("investigations.print_corrigendum.download_and_print")}</li>
                <li>{tx("investigations.print_corrigendum.print_recommendation")}</li>
              </ul>
              <DownloadButton
                id="download-corrigendum-button"
                icon="download"
                href="#"
                title={t("investigations.print_corrigendum.download_corrigendum_link", {
                  number: pollingStation.number,
                })}
                subtitle={election.counting_method === "CSO" ? "Na 14-2 Bijlage 1" : "Na 14-1, versie 2"}
                onClick={(event) => {
                  if (election.counting_method === "DSO" && !committeeSessionDetailsPresent(currentCommitteeSession)) {
                    event.preventDefault();
                    setShowMissingCommitteeSessionDetailsModal(true);
                  } else {
                    directDownload(`/api/polling_stations/${pollingStationId}/investigation/download_corrigendum_pdf`);
                  }
                }}
              />
              <ul className="mb-0">
                <li>{t("investigations.print_corrigendum.corrigendum_explanation")}</li>
                <li>{t("investigations.print_corrigendum.more_investigations")}</li>
              </ul>
            </section>
          </FormLayout.Section>
          <FormLayout.Section title={t("investigations.print_corrigendum.conduct_investigation")}>
            <section className="sm">
              <ul className="mt-0 mb-0">
                <li>{t("investigations.print_corrigendum.investigate_results")}</li>
                <li>{t("investigations.print_corrigendum.recount_needed")}</li>
              </ul>
            </section>
          </FormLayout.Section>
          <FormLayout.Section title={t("investigations.print_corrigendum.after_the_investigation")}>
            <section className="sm">
              <ul className="mt-0 mb-0">
                <li>{t("investigations.print_corrigendum.add_the_findings")}</li>
                <li>{t("investigations.print_corrigendum.indicate_new_result")}</li>
                <li>{t("investigations.print_corrigendum.if_new_result")}</li>
              </ul>
            </section>
          </FormLayout.Section>
          <FormLayout.Controls>
            <Button.Link size="lg" to={`/elections/${election.id}/investigations`}>
              {t("investigations.print_corrigendum.back_to_all_investigations")}
            </Button.Link>
            <Button.Link size="lg" variant="secondary" to="../findings">
              {t("investigations.print_corrigendum.continue_to_findings")}
            </Button.Link>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
      {showMissingCommitteeSessionDetailsModal && (
        <MissingCommitteeSessionDetailsModal
          to={`/elections/${election.id}/details`}
          onClose={() => {
            setShowMissingCommitteeSessionDetailsModal(false);
          }}
        />
      )}
    </>
  );
}
