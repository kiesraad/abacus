import { RouteObject } from "react-router";

import { CandidatesVotesPage } from "./components/candidates_votes/CandidatesVotesPage";
import { CheckAndSavePage } from "./components/check_and_save/CheckAndSavePage";
import { DataEntryLayout } from "./components/DataEntryLayout";
import { DifferencesPage } from "./components/differences/DifferencesPage";
import { RecountedPage } from "./components/recounted/RecountedPage";
import { VotersAndVotesPage } from "./components/voters_and_votes/VotersAndVotesPage";

export const dataEntryRoutes: RouteObject[] = [
  {
    element: <DataEntryLayout />,
    children: [
      { index: true, element: null },
      { path: "recounted", element: <RecountedPage /> },
      {
        path: "voters-and-votes",
        element: <VotersAndVotesPage />,
      },
      { path: "differences", element: <DifferencesPage /> },
      {
        path: "list/:listNumber",
        element: <CandidatesVotesPage />,
      },
      { path: "save", element: <CheckAndSavePage /> },
    ],
  },
];
