import * as React from "react";

import { usePollingStationFormController } from "@kiesraad/api";

export function PollingStationSaveForm() {
  const { registerCurrentForm, formState } = usePollingStationFormController();

  React.useEffect(() => {
    registerCurrentForm({
      id: "save",
      type: "save",
      getValues: () => ({}),
    });
  }, [registerCurrentForm]);

  return (
    <div>
      <h2>Controleren en opslaan</h2>

      <p>Hieronder zie je een overzicht van alle eventuele fouten en waarschuwingen.</p>

      {Object.values(formState.sections).map((section) => (
        <div key={section.id}>
          <h3>{section.title || section.id}</h3>
          <h4>Errors:</h4>
          {section.errors.map((error, n) => (
            <p key={`error${n}`}>{error.code}</p>
          ))}
          <h4>Warnings:</h4>
          {section.warnings.map((warning, n) => (
            <p key={`warning${n}`}>{warning.code}</p>
          ))}

          <br />
          <br />
          <br />
        </div>
      ))}
    </div>
  );
}
