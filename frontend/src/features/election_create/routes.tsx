import { RouteObject } from "react-router";

import { CheckAndSave } from "./components/CheckAndSave";
import { ElectionCreateLayout } from "./components/ElectionCreateLayout";
import { UploadCandidatesDefinition } from "./components/UploadCandidatesDefinition";
import { UploadElectionDefinition } from "./components/UploadElectionDefinition";

export const electionCreateRoutes: RouteObject[] = [
  {
    Component: ElectionCreateLayout,
    children: [
      { index: true, Component: UploadElectionDefinition },
      { path: "list-of-candidates", Component: UploadCandidatesDefinition },
      { path: "check-and-save", Component: CheckAndSave },
    ],
  },
];
