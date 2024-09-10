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
      <section className="md">
        {!summary.hasBlocks && summary.countsAddUp && (
          <p className="md">
            De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet
            tegen. Er zijn geen blokkerende fouten of waarschuwingen.
          </p>
        )}
        {summary.hasBlocks && summary.countsAddUp && (
          <>
            <p className="md">
              De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet
              tegen. Er zijn waarschuwingen die moeten worden gecontroleerd. Controleer de
              openstaande waarschuwingen
            </p>

            <p className="md">
              Hieronder zie je een overzicht van alle eventuele fouten en waarschuwingen.
            </p>
          </>
        )}

        {summary.hasBlocks && !summary.countsAddUp && (
          <>
            <p className="md">
              De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar tegen.
              Je kan de resultaten daarom niet opslaan.
            </p>
            <p className="md">
              Los de blokkerende fouten op. Lukt dat niet? Overleg dan met de coördinator.{" "}
            </p>
          </>
        )}
      </section>

      <StatusList>
        {summary.countsAddUp && (
          <StatusList.Item status="accept">Alle optellingen kloppen</StatusList.Item>
        )}

        {summary.notableFormSections.map((section) => {
          const link = (
            <Link to={getUrlForFormSection(section.formSection.id)}>
              {section.formSection.title}
            </Link>
          );
          let content = <></>;
          switch (section.status) {
            case "empty":
              content = <>Op {link} zijn geen stemmen ingevoerd</>;
              break;
            case "accepted-warnings":
              content = <>{link} heeft geaccepteerde waarschuwingen</>;
              break;
            case "unaccepted-warnings":
              content = <>Controleer waarschuwingen bij {link}</>;
              break;
            case "errors":
              content = <>{link} heeft blokkerende fouten</>;
          }
          return (
            <StatusList.Item
              key={section.formSection.id}
              status={menuStatusForFormSectionStatus(section.status)}
            >
              {content}
            </StatusList.Item>
          );
        })}

        {!summary.hasBlocks && !summary.hasWarnings && (
          <StatusList.Item status="accept">
            Er zijn geen blokkerende fouten of waarschuwingen
          </StatusList.Item>
        )}
        {summary.hasBlocks ? (
          <StatusList.Item status="warning">
            Je kan de resultaten van dit stembureau nog niet opslaan
          </StatusList.Item>
        ) : (
          <StatusList.Item status="accept" emphasis>
            Je kan de resultaten van dit stembureau opslaan
          </StatusList.Item>
        )}
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
