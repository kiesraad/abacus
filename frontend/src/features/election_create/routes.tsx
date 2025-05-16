import { RouteObject } from "react-router";

import { CheckElectionDefinition } from "./components/CheckElectionDefinition";
import { ElectionCreateLayout } from "./components/ElectionCreateLayout";
import { UploadElectionDefinition } from "./components/UploadElectionDefinition";

export const electionCreateRoutes: RouteObject[] = [
  {
    Component: ElectionCreateLayout,
    children: [
      { index: true, Component: UploadElectionDefinition },
      { path: "check-definition", Component: CheckElectionDefinition },
    ],
  },
];
