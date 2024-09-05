import * as React from "react";
import { Link } from "react-router-dom";

import { getUrlForFormSectionID } from "app/component/pollingstation/utils";

import {
  Election,
  FormSectionID,
  getPollingStationSummary,
  PollingStationFormSectionStatus,
  usePollingStationFormController,
} from "@kiesraad/api";
import { MenuStatus, StatusList } from "@kiesraad/ui";

export interface PollingStationSaveFormProps {
  pollingStationId: number;
  election: Required<Election>;
}

export function PollingStationSaveForm({
  pollingStationId,
  election,
}: PollingStationSaveFormProps) {
  const { registerCurrentForm, formState, values } = usePollingStationFormController();

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionID) => {
      const baseUrl = `/${election.id}/input/${pollingStationId}`;
      return getUrlForFormSectionID(baseUrl, id);
    },
    [election, pollingStationId],
  );

  React.useEffect(() => {
    registerCurrentForm({
      id: "save",
      type: "save",
      getValues: () => ({}),
    });
  }, [registerCurrentForm]);

  const summary = React.useMemo(() => {
    return getPollingStationSummary(formState, values);
  }, [formState, values]);

  return (
    <div>
      <h2>Controleren en opslaan</h2>

      {!summary.hasBlocks && summary.countsAddUp && (
        <p>
          De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen.
          Er zijn geen blokkerende fouten of waarschuwingen.
        </p>
      )}
      {summary.hasBlocks && summary.countsAddUp && (
        <>
          <p>
            De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet
            tegen. Er zijn waarschuwingen die moeten worden gecontroleerd. Controleer de openstaande
            waarschuwingen
          </p>

          <p>Hieronder zie je een overzicht van alle eventuele fouten en waarschuwingen.</p>
        </>
      )}

      {summary.hasBlocks && !summary.countsAddUp && (
        <>
          <p>
            De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar tegen. Je
            kan de resultaten daarom niet opslaan.
          </p>
          <p>Los de blokkerende fouten op. Lukt dat niet? Overleg dan met de coördinator. </p>
        </>
      )}
      <StatusList>
        {summary.countsAddUp && (
          <StatusList.Item status="accept">Alle optellingen kloppen</StatusList.Item>
        )}

        {summary.notableFormSections.map((section) => (
          <StatusList.Item
            key={section.formSection.id}
            status={menuStatusForFormSectionStatus(section.status)}
          >
            {section.formSection.title}
            <Link to={getUrlForFormSection(section.formSection.id)}>Ga naar</Link>
          </StatusList.Item>
        ))}
      </StatusList>
    </div>
  );
}

function menuStatusForFormSectionStatus(status: PollingStationFormSectionStatus): MenuStatus {
  switch (status) {
    case "empty":
      return "empty";
    case "unaccepted-warnings":
      return "warning";
    case "accepted-warnings":
      return "warning";
    case "errors":
      return "error";
  }
}
