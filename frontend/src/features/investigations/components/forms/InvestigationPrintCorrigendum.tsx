import { useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/Button/Button";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { t, tx } from "@/i18n/translate";

import { StartDataEntryModal } from "../StartDataEntryModal";

interface InvestigationPrintCorrigendumProps {
  pollingStationId: number;
}

export function InvestigationPrintCorrigendum({ pollingStationId }: InvestigationPrintCorrigendumProps) {
  const { election, pollingStation, currentCommitteeSession } = useElection(pollingStationId);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const closeModal = () => {
    setShowModal(false);
  };

  const goToFindings = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (currentCommitteeSession.status === "data_entry_not_started") {
      setShowModal(true);
    } else {
      void navigate("../findings");
    }
  };

  if (!pollingStation) {
    return <Loader />;
  }

  return (
    <Form title={t("investigations.print_corrigendum.title")}>
      <FormLayout>
        <FormLayout.Section>
          <section className="sm">
            <ul className="mt-0">
              <li>{tx("investigations.print_corrigendum.download_and_print")}</li>
              <li>{tx("investigations.print_corrigendum.print_recommendation")}</li>
            </ul>
            <DownloadButton
              icon="download"
              href={`/api/polling_stations/${pollingStationId}/investigation/download_corrigendum_pdf`}
              title={t("investigations.print_corrigendum.download_corrigendum_link", { number: pollingStation.number })}
              subtitle="Na 14-2 Bijlage 1"
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
          <Button type="button" size="lg" variant="secondary" onClick={goToFindings}>
            {t("investigations.print_corrigendum.continue_to_findings")}
          </Button>
        </FormLayout.Controls>
      </FormLayout>
      {showModal && <StartDataEntryModal onClose={closeModal} to="../findings" />}
    </Form>
  );
}
