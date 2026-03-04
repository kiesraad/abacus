import type { RouteObject } from "react-router";

import { CheckAndSave } from "./components/CheckAndSave";
import { CommitteeCategory } from "./components/CommitteeCategory.tsx";
import { CountingMethodType } from "./components/CountingMethodType";
import { ElectionCreateLayout } from "./components/ElectionCreateLayout";
import { NumberOfVoters } from "./components/NumberOfVoters";
import { UploadCandidatesDefinition } from "./components/UploadCandidatesDefinition";
import { UploadElectionDefinition } from "./components/UploadElectionDefinition";
import { UploadPollingStationDefinition } from "./components/UploadPollingStationDefinition";

export const electionCreateRoutes: RouteObject[] = [
  {
    Component: ElectionCreateLayout,
    children: [
      { index: true, Component: UploadElectionDefinition, handle: { roles: ["administrator"] } },
      { path: "committee-category", Component: CommitteeCategory, handle: { roles: ["administrator"] } },
      { path: "list-of-candidates", Component: UploadCandidatesDefinition, handle: { roles: ["administrator"] } },
      { path: "polling-stations", Component: UploadPollingStationDefinition, handle: { roles: ["administrator"] } },
      { path: "counting-method-type", Component: CountingMethodType, handle: { roles: ["administrator"] } },
      { path: "number-of-voters", Component: NumberOfVoters, handle: { roles: ["administrator"] } },
      { path: "check-and-save", Component: CheckAndSave, handle: { roles: ["administrator"] } },
    ],
  },
];
