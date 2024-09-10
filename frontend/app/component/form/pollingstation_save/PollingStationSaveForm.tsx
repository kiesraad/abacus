import * as React from "react";
import { useNavigate } from "react-router-dom";

import { useElection, usePollingStationFormController } from "@kiesraad/api";
import { BottomBar, Button, Form, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";

export function PollingStationSaveForm() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { registerCurrentForm, formState, status, finaliseDataEntry } = usePollingStationFormController();

  React.useEffect(() => {
    registerCurrentForm({
      id: "save",
      type: "save",
      getValues: () => ({}),
    });
  }, [registerCurrentForm]);

  const finalisationAllowed = Object.values(formState.sections).every(
    (section) => section.errors.length === 0 && (section.warnings.length === 0 || section.ignoreWarnings),
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    void (async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!finalisationAllowed) return;

      await finaliseDataEntry();
      navigate(`/${election.id}/input#data_entry_saved`);
    })(event);

  return (
    <Form onSubmit={handleSubmit} id="check_save_form">
      <h2>Controleren en opslaan</h2>

      {/* TODO: #103 format this according to design */}
      <p>Hieronder zie je een overzicht van alle eventuele fouten en waarschuwingen.</p>
      <ul>
        {Object.values(formState.sections).map((section) => (
          <li key={section.id}>
            <span>{section.title || section.id}</span>
            <ul>
              <li>
                <span>Fouten:</span>
                <ul>
                  {section.errors.map((error, n) => (
                    <li key={`error${n}`}>{error.code}</li>
                  ))}
                </ul>
              </li>
              <li>
                <span>Waarschuwingen:</span>
                <ul>
                  {section.warnings.map((warning, n) => (
                    <li key={`warning${n}`}>{warning.code}</li>
                  ))}
                </ul>
              </li>
              <li>Waarschuwingen geaccepteerd: {section.ignoreWarnings ? "Ja" : "Nee"}</li>
            </ul>
          </li>
        ))}
      </ul>
      {finalisationAllowed ? (
        <p>Je kan de resultaten van dit stembureau opslaan.</p>
      ) : (
        <p>Je kan de resultaten van dit stembureau nog niet opslaan.</p>
      )}

      {finalisationAllowed && (
        <BottomBar type="input-grid">
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
