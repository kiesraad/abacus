import type { StoryFn } from "@storybook/react-vite";

import * as gte19Seats from "../testing/gte-19-seats";

import { ChosenCandidatesTable } from "./ChosenCandidatesTable";

export const Default: StoryFn = () => (
  <ChosenCandidatesTable chosenCandidates={gte19Seats.candidate_nomination.chosen_candidates} />
);

export default {};
