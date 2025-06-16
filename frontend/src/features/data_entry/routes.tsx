import { RouteObject } from "react-router";

import { CandidatesVotesPage } from "./components/candidates_votes/CandidatesVotesPage";
import { CheckAndSavePage } from "./components/check_and_save/CheckAndSavePage";
import { DataEntryLayout } from "./components/DataEntryLayout";
import { DifferencesPage } from "./components/differences/DifferencesPage";
import { RecountedPage } from "./components/recounted/RecountedPage";
import { VotersAndVotesPage } from "./components/voters_and_votes/VotersAndVotesPage";

export const dataEntryRoutes: RouteObject[] = [
  {
    Component: DataEntryLayout,
    children: [
      { index: true, Component: null },
      { path: "recounted", Component: RecountedPage },
      {
        path: "voters-and-votes",
        Component: VotersAndVotesPage,
      },
      { path: "differences", Component: DifferencesPage },
      {
        path: "list/:groupNumber",
        Component: CandidatesVotesPage,
      },
      { path: "save", Component: CheckAndSavePage },
    ],
  },
];
