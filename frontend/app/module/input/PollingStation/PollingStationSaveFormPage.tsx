import { PollingStationSaveForm } from "app/component/form/pollingstation_save/PollingStationSaveForm";

import { useElection } from "@kiesraad/api";
import { useNumericParam } from "@kiesraad/util";

export const PollingStationSaveFormPage = () => {
  const { election } = useElection();
  const pollingStationId = useNumericParam("pollingStationId");

  return <PollingStationSaveForm election={election} pollingStationId={pollingStationId} />;
};
