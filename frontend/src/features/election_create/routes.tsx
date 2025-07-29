import { RouteObject } from "react-router";

import { CheckAndSave } from "./components/CheckAndSave";
import { CountingMethodType } from "./components/CountingMethodType";
import { ElectionCreateLayout } from "./components/ElectionCreateLayout";
import { UploadCandidatesDefinition } from "./components/UploadCandidatesDefinition";
import { UploadElectionDefinition } from "./components/UploadElectionDefinition";
import { UploadPollingStationDefinition } from "./components/UploadPollingStationDefinition";

export const electionCreateRoutes: RouteObject[] = [
  {
    Component: ElectionCreateLayout,
    children: [
      { index: true, Component: UploadElectionDefinition },
      { path: "list-of-candidates", Component: UploadCandidatesDefinition },
      { path: "polling-stations", Component: UploadPollingStationDefinition },
      { path: "counting-method-type", Component: CountingMethodType },
      { path: "check-and-save", Component: CheckAndSave },
    ],
  },
];
