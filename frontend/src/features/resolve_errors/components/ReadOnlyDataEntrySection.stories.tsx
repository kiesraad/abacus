import type { Meta, StoryObj } from "@storybook/react-vite";

import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { PollingStationResults, ValidationResults } from "@/types/generated/openapi";
import { FormSectionId } from "@/types/types";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { ReadOnlyDataEntrySection } from "./ReadOnlyDataEntrySection";

const pollingStationResults: PollingStationResults = {
  extra_investigation: {
    extra_investigation_other_reason: { yes: false, no: false },
    ballots_recounted_extra_investigation: { yes: false, no: false },
  },
  counting_differences_polling_station: {
    unexplained_difference_ballots_voters: { yes: false, no: false },
    difference_ballots_per_list: { yes: false, no: false },
  },
  voters_counts: {
    poll_card_count: 185,
    proxy_certificate_count: 12,
    total_admitted_voters_count: 205,
  },
  votes_counts: {
    political_group_total_votes: [
      { number: 1, total: 142 },
      { number: 2, total: 56 },
    ],
    total_votes_candidates_count: 198,
    blank_votes_count: 4,
    invalid_votes_count: 2,
    total_votes_cast_count: 204,
  },
  differences_counts: {
    more_ballots_count: 0,
    fewer_ballots_count: 2,
    admitted_voters_equals_votes_cast: false,
    votes_cast_greater_than_admitted_voters: false,
    votes_cast_smaller_than_admitted_voters: false,
    difference_completely_accounted_for: {
      no: true,
      yes: true,
    },
  },
  political_group_votes: [
    {
      number: 1,
      total: 142,
      candidate_votes: [
        { number: 1, votes: 85 },
        { number: 2, votes: 23 },
        { number: 3, votes: 12 },
        { number: 4, votes: 8 },
        { number: 5, votes: 6 },
        { number: 6, votes: 3 },
        { number: 7, votes: 2 },
        { number: 8, votes: 1 },
        { number: 9, votes: 1 },
        { number: 10, votes: 1 },
        ...Array.from({ length: 19 }, (_, i) => ({ number: i + 11, votes: 0 })),
      ],
    },
    {
      number: 2,
      total: 56,
      candidate_votes: [
        { number: 1, votes: 34 },
        { number: 2, votes: 22 },
      ],
    },
  ],
};

const dataEntryStructure = getDataEntryStructure(electionMockData, pollingStationResults);
const sectionIds = dataEntryStructure.map((section) => section.id);

type Props = {
  sectionId: FormSectionId;
};

export const ReadOnlySection: StoryObj<Props> = {
  argTypes: {
    sectionId: {
      options: sectionIds,
      control: { type: "select" },
    },
  },

  args: {
    sectionId: sectionIds[0],
  },

  render: ({ sectionId }) => {
    // Get data entry structure
    const validationResults: ValidationResults = {
      errors: [validationResultMockData.F201, validationResultMockData.F303],
      warnings: [validationResultMockData.W201],
    };

    // Find the selected section
    const selectedSection = dataEntryStructure.find((section) => section.id === sectionId);

    if (!selectedSection) {
      return <div>Section not found</div>;
    }

    return (
      <ReadOnlyDataEntrySection
        section={selectedSection}
        data={pollingStationResults}
        validationResults={validationResults}
      />
    );
  },
};

export default {} satisfies Meta<Props>;
