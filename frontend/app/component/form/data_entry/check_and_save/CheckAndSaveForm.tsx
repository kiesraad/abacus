import * as React from "react";
import { Link, useNavigate } from "react-router-dom";

import { getUrlForFormSectionID } from "app/component/pollingstation/utils";

import {
  FormSectionID,
  getPollingStationSummary,
  PollingStationFormSectionStatus,
  useElection,
  usePollingStationFormController,
} from "@kiesraad/api";
import { BottomBar, Button, Form, KeyboardKey, KeyboardKeys, MenuStatus, StatusList } from "@kiesraad/ui";

export function CheckAndSaveForm() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { registerCurrentForm, formState, status, finaliseDataEntry, pollingStationId, values } =
    usePollingStationFormController();

  const getUrlForFormSection = React.useCallback(
    (id: FormSectionID) => {
      return getUrlForFormSectionID(election.id, pollingStationId, id);
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
  const finalisationAllowed = Object.values(formState.sections).every(
    (section) => section.errors.length === 0 && (section.warnings.length === 0 || section.acceptWarnings),
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    void (async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!finalisationAllowed) return;

      try {
        await finaliseDataEntry();
        navigate(`/elections/${election.id}/data-entry#data-entry-saved`);
      } catch (e) {
        console.error("Error", e);
      }
    })(event);

  return (
    <Form onSubmit={handleSubmit} id="check_save_form" title="Controleren en opslaan">
      <section className="md" id="save-form-summary-text">
        {!summary.hasBlocks && summary.countsAddUp && (
          <p className="md">
            De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn geen
            blokkerende fouten of waarschuwingen.
          </p>
        )}
        {summary.hasBlocks && summary.countsAddUp && (
          <>
            <p className="md">
              De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar niet tegen. Er zijn
              waarschuwingen die moeten worden gecontroleerd.
            </p>

            <p className="md">Controleer de openstaande waarschuwingen</p>
          </>
        )}

        {summary.hasBlocks && !summary.countsAddUp && (
          <>
            <p className="md">
              De aantallen die je hebt ingevoerd in de verschillende stappen spreken elkaar tegen. Je kan de resultaten
              daarom niet opslaan.
            </p>
            <p className="md">Los de blokkerende fouten op. Lukt dat niet? Overleg dan met de coördinator. </p>
          </>
        )}
      </section>

      <StatusList id="save-form-summary-list">
        {summary.countsAddUp && <StatusList.Item status="accept">Alle optellingen kloppen</StatusList.Item>}

        {summary.notableFormSections.map((section) => {
          const link = (
            <Link to={getUrlForFormSection(section.formSection.id)}>{section.title || section.formSection.title}</Link>
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
              id={`section-status-${section.formSection.id}`}
            >
              {content}
            </StatusList.Item>
          );
        })}

        {!summary.hasBlocks && !summary.hasWarnings && (
          <StatusList.Item status="accept" id="no-blocking-errors-or-warnings">
            Er zijn geen blokkerende fouten of waarschuwingen
          </StatusList.Item>
        )}
        {summary.hasBlocks ? (
          <StatusList.Item status={summary.hasErrors ? "error" : "warning"} id="form-cannot-be-saved" emphasis>
            Je kan de resultaten van dit stembureau nog niet opslaan
          </StatusList.Item>
        ) : (
          <StatusList.Item status="accept" id="form-can-be-saved" emphasis>
            Je kan de resultaten van dit stembureau opslaan
          </StatusList.Item>
        )}
      </StatusList>

      {finalisationAllowed && (
        <BottomBar type="form">
          <BottomBar.Row>
            <Button type="submit" size="lg" disabled={status.current === "finalising"}>
              Opslaan
            </Button>
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </BottomBar.Row>
        </BottomBar>
      )}
    </Form>
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
