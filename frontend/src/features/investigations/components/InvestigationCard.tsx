import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { IconCheckmark, IconMinus, IconPencil, IconPrinter } from "@/components/generated/icons";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";

import { PollingStationInvestigationWithStatus } from "../hooks/useInvestigations";
import cls from "./InvestigationCard.module.css";
import { StartDataEntryModal } from "./StartDataEntryModal";

interface InvestigationCardProps {
  investigation: PollingStationInvestigationWithStatus;
}

export function InvestigationCard({ investigation }: InvestigationCardProps) {
  const { isCoordinator } = useUserRole();
  const { currentCommitteeSession, election } = useElection();
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
      void navigate(`./${investigation.pollingStation.id}/findings`);
    }
  };

  return (
    <div className={cls.card} id={`investigation-${investigation.pollingStation.number}`}>
      <div className={cls.card_header}>
        <PollingStationNumber size="sm">{investigation.pollingStation.number}</PollingStationNumber>
        <h3>{investigation.pollingStation.name}</h3>
        {isCoordinator && investigation.findings && (
          <Link to={`./${investigation.pollingStation.id}/findings`}>
            <Icon size="sm" icon={<IconPencil />} />
            {t("investigations.edit")}
          </Link>
        )}
      </div>
      <h4>{t("investigations.reason_and_assignment.title")}</h4>
      <pre>{investigation.reason}</pre>
      {isCoordinator && !investigation.findings && (
        <div className="mt-sm">
          <Link to={`./${investigation.pollingStation.id}/print-corrigendum`}>
            <Icon size="sm" icon={<IconPrinter />} />
            {t("investigations.print_corrigendum.action")}
          </Link>
        </div>
      )}
      <h4>{t("investigations.findings.title_long")}</h4>
      {investigation.findings ? (
        <pre>{investigation.findings}</pre>
      ) : (
        isCoordinator && (
          <Button variant="underlined" onClick={goToFindings}>
            {t("investigations.findings.fill")}
          </Button>
        )
      )}
      {investigation.corrected_results !== undefined && (
        <>
          {investigation.corrected_results ? (
            <>
              <h4>
                {t("investigations.corrected_results")}
                <Icon color="default" size="sm" icon={<IconCheckmark />} />
              </h4>
              {investigation.status === "definitive" ? (
                <p>{t("investigations.corrected_results_inserted")}</p>
              ) : investigation.status === "first_entry_not_started" ? (
                <p>{t("investigations.corrected_results_not_yet_inserted")}</p>
              ) : (
                <p className={cls.flex}>
                  {t("investigations.corrigendum_data_entry_in_progress")}&nbsp;-&nbsp;
                  <Link to={`/elections/${election.id}/status`}>{t("view_progress").toLowerCase()}</Link>
                </p>
              )}
            </>
          ) : (
            <h4>
              {t("investigations.no_corrected_results")}
              <Icon color="muted" size="sm" icon={<IconMinus />} />
            </h4>
          )}
        </>
      )}
      {showModal && <StartDataEntryModal onClose={closeModal} to={`./${investigation.pollingStation.id}/findings`} />}
    </div>
  );
}
