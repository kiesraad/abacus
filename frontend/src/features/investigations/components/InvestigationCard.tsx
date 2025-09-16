import { Link } from "react-router";

import { IconCheckmark, IconMinus, IconPencil, IconPrinter } from "@/components/generated/icons";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { Icon } from "@/components/ui/Icon/Icon";
import { t } from "@/i18n/translate";

import { PollingStationInvestigationWithStatus } from "../hooks/useInvestigations";
import cls from "./InvestigationCard.module.css";

interface InvestigationCardProps {
  investigation: PollingStationInvestigationWithStatus;
}

export function InvestigationCard({ investigation }: InvestigationCardProps) {
  return (
    <div className={cls.card}>
      <div className={cls.card_header}>
        <PollingStationNumber size="sm">{investigation.pollingStation.number}</PollingStationNumber>
        <h3>{investigation.pollingStation.name}</h3>
        {investigation.findings && (
          <Link to={`./${investigation.pollingStation.id}/findings`}>
            <Icon size="md" icon={<IconPencil />} />
            {t("investigations.edit")}
          </Link>
        )}
      </div>
      <h4>{t("investigations.reason_and_assignment.title")}</h4>
      <p>{investigation.reason}</p>
      {!investigation.findings && (
        <div className="mt-sm">
          <Link to={`./${investigation.pollingStation.id}/print-corrigendum`}>
            <Icon size="md" icon={<IconPrinter />} />
            {t("investigations.print_corrigendum.title")}
          </Link>
        </div>
      )}
      <h4>{t("investigations.findings.title_long")}</h4>
      {investigation.findings ? (
        <p>{investigation.findings}</p>
      ) : (
        <Link to={`./${investigation.pollingStation.id}/findings`}>{t("investigations.findings.fill")}</Link>
      )}
      {investigation.corrected_results !== undefined && (
        <>
          {investigation.corrected_results ? (
            <>
              <h4>
                {t("investigations.corrected_results")}
                <Icon color="default" size="md" icon={<IconCheckmark />} />
              </h4>
              {investigation.status === "definitive" ? (
                <p>{t("investigations.corrected_results_inserted")}</p>
              ) : (
                <p>{t("investigations.corrected_results_not_yet_inserted")}</p>
              )}
            </>
          ) : (
            <h4>
              {t("investigations.no_corrected_results")}
              <Icon color="muted" size="md" icon={<IconMinus />} />
            </h4>
          )}
        </>
      )}
    </div>
  );
}
