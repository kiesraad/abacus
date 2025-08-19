import { t, tx } from "@/i18n/translate";
import { ElectionWithPoliticalGroups, PoliticalGroup, PollingStationResults } from "@/types/generated/openapi";
import { DataEntrySection, DataEntryStructure, InputGridSubsectionRow } from "@/types/types";
import { getCandidateFullName } from "@/utils/candidate";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";

export const votersAndVotesSection: DataEntrySection = {
  id: "voters_votes_counts",
  title: t("voters_votes_counts.form_title"),
  short_title: t("voters_votes_counts.short_title"),
  sectionNumber: t("voters_votes_counts.section_number"),
  subsections: [
    {
      type: "inputGrid",
      headers: [t("field"), t("counted_number"), t("description")],
      rows: [
        {
          code: "A",
          path: "voters_counts.poll_card_count",
          title: t("voters_votes_counts.voters_counts.poll_card_count"),
          autoFocusInput: true,
        },
        {
          code: "B",
          path: "voters_counts.proxy_certificate_count",
          title: t("voters_votes_counts.voters_counts.proxy_certificate_count"),
        },
        {
          code: "D",
          path: "voters_counts.total_admitted_voters_count",
          title: t("voters_votes_counts.voters_counts.total_admitted_voters_count"),
          isTotal: true,
          addSeparator: true,
        },
        {
          code: "E",
          path: "votes_counts.votes_candidates_count",
          title: t("voters_votes_counts.votes_counts.votes_candidates_count"),
        },
        {
          code: "F",
          path: "votes_counts.blank_votes_count",
          title: t("voters_votes_counts.votes_counts.blank_votes_count"),
        },
        {
          code: "G",
          path: "votes_counts.invalid_votes_count",
          title: t("voters_votes_counts.votes_counts.invalid_votes_count"),
        },
        {
          code: "H",
          path: "votes_counts.total_votes_cast_count",
          title: t("voters_votes_counts.votes_counts.total_votes_cast_count"),
          isTotal: true,
        },
      ],
    },
  ],
};

export const differencesSection: DataEntrySection = {
  id: "differences_counts",
  title: t("differences_counts.form_title"),
  short_title: t("differences_counts.short_title"),
  sectionNumber: t("differences_counts.section_number"),
  subsections: [
    {
      type: "checkboxes",
      title: tx("differences_counts.compare_votes_cast_admitted_voters.title"),
      short_title: t("differences_counts.compare_votes_cast_admitted_voters.short_title"),
      error_path: "differences_counts.compare_votes_cast_admitted_voters",
      error_message: t("differences_counts.validation_error"),
      options: [
        {
          path: "differences_counts.admitted_voters_equals_votes_cast",
          label: t("differences_counts.admitted_voters_equals_votes_cast.title"),
          short_label: t("differences_counts.admitted_voters_equals_votes_cast.short_title"),
          autoFocusInput: true,
        },
        {
          path: "differences_counts.votes_cast_greater_than_admitted_voters",
          label: t("differences_counts.votes_cast_greater_than_admitted_voters.title"),
          short_label: t("differences_counts.votes_cast_greater_than_admitted_voters.short_title"),
        },
        {
          path: "differences_counts.votes_cast_smaller_than_admitted_voters",
          label: t("differences_counts.votes_cast_smaller_than_admitted_voters.title"),
          short_label: t("differences_counts.votes_cast_smaller_than_admitted_voters.short_title"),
        },
      ],
    },
    {
      type: "inputGrid",
      headers: [t("field"), t("counted_number"), t("description")],
      rows: [
        {
          code: "I",
          path: "differences_counts.more_ballots_count",
          title: t("differences_counts.differences_counts.more_ballots_count"),
        },
        {
          code: "J",
          path: "differences_counts.fewer_ballots_count",
          title: t("differences_counts.differences_counts.fewer_ballots_count"),
        },
      ],
    },
    {
      type: "checkboxes",
      title: tx("differences_counts.difference_completely_accounted_for.title"),
      short_title: t("differences_counts.difference_completely_accounted_for.short_title"),
      error_path: "differences_counts.difference_completely_accounted_for",
      error_message: t("differences_counts.validation_error"),
      options: [
        {
          path: "differences_counts.difference_completely_accounted_for.yes",
          label: t("yes"),
          short_label: t("yes"),
        },
        {
          path: "differences_counts.difference_completely_accounted_for.no",
          label: t("no"),
          short_label: t("no"),
        },
      ],
    },
  ],
};

export const extraInvestigationSection: DataEntrySection = {
  id: "extra_investigation",
  title: t("extra_investigation.form_title"),
  short_title: t("extra_investigation.short_title"),
  sectionNumber: "B1-1",
  subsections: [
    {
      type: "message",
      message: t("extra_investigation.form_description"),
    },
    {
      type: "checkboxes",
      description: t("extra_investigation.extra_investigation_other_reason.description"),
      short_title: t("extra_investigation.extra_investigation_other_reason.short_title"),
      error_path: "extra_investigation.extra_investigation_other_reason",
      error_message: t("extra_investigation.validation_error"),
      options: [
        {
          path: "extra_investigation.extra_investigation_other_reason.yes",
          label: t("yes"),
          short_label: t("yes"),
          autoFocusInput: true,
        },
        {
          path: "extra_investigation.extra_investigation_other_reason.no",
          label: t("no"),
          short_label: t("no"),
        },
      ],
    },
    {
      type: "checkboxes",
      description: t("extra_investigation.ballots_recounted_extra_investigation.description"),
      short_title: t("extra_investigation.ballots_recounted_extra_investigation.short_title"),
      error_path: "extra_investigation.ballots_recounted_extra_investigation",
      error_message: t("extra_investigation.validation_error"),
      options: [
        {
          path: "extra_investigation.ballots_recounted_extra_investigation.yes",
          label: t("yes"),
          short_label: t("yes"),
        },
        {
          path: "extra_investigation.ballots_recounted_extra_investigation.no",
          label: t("no"),
          short_label: t("no"),
        },
      ],
    },
  ],
};

export const countingDifferencesPollingStation: DataEntrySection = {
  id: "counting_differences_polling_station",
  title: t("counting_differences_polling_station.form_title"),
  short_title: t("counting_differences_polling_station.short_title"),
  sectionNumber: "B1-2",
  subsections: [
    {
      type: "message",
      message: t("counting_differences_polling_station.form_description"),
    },
    {
      type: "checkboxes",
      title: t("counting_differences_polling_station.unexplained_difference_ballots_voters.title"),
      description: t("counting_differences_polling_station.unexplained_difference_ballots_voters.description"),
      short_title: t("counting_differences_polling_station.unexplained_difference_ballots_voters.short_title"),
      error_path: "counting_differences_polling_station.unexplained_difference_ballots_voters",
      error_message: t("counting_differences_polling_station.validation_error"),
      options: [
        {
          path: "counting_differences_polling_station.unexplained_difference_ballots_voters.yes",
          label: t("yes"),
          short_label: t("yes"),
          autoFocusInput: true,
        },
        {
          path: "counting_differences_polling_station.unexplained_difference_ballots_voters.no",
          label: t("no"),
          short_label: t("no"),
        },
      ],
    },
    {
      type: "checkboxes",
      title: t("counting_differences_polling_station.difference_ballots_per_list.title"),
      description: t("counting_differences_polling_station.difference_ballots_per_list.description"),
      short_title: t("counting_differences_polling_station.difference_ballots_per_list.short_title"),
      error_path: "counting_differences_polling_station.difference_ballots_per_list",
      error_message: t("counting_differences_polling_station.validation_error"),
      options: [
        {
          path: "counting_differences_polling_station.difference_ballots_per_list.yes",
          label: t("yes"),
          short_label: t("yes"),
        },
        {
          path: "counting_differences_polling_station.difference_ballots_per_list.no",
          label: t("no"),
          short_label: t("no"),
        },
      ],
    },
  ],
};

/**
 * Creates political group sections based on election data
 * @param election ElectionWithPoliticalGroups object
 * @returns Array of DataEntrySection objects for each political group
 */
export function createPoliticalGroupSections(election: ElectionWithPoliticalGroups): DataEntrySection[] {
  return election.political_groups.map((politicalGroup: PoliticalGroup): DataEntrySection => {
    const rows: InputGridSubsectionRow[] = [];

    // Add candidate vote fields
    politicalGroup.candidates.forEach((candidate, index) => {
      rows.push({
        code: `${candidate.number}`,
        path: `political_group_votes[${politicalGroup.number - 1}].candidate_votes[${index}].votes`,
        title: getCandidateFullName(candidate),
        autoFocusInput: index === 0,
        addSeparator: (index + 1) % 25 === 0 && index + 1 !== politicalGroup.candidates.length,
      });
    });

    rows.push({
      path: `political_group_votes[${politicalGroup.number - 1}].total`,
      title: t("totals_list", { group_number: politicalGroup.number }),
      isListTotal: true,
    });

    const title = formatPoliticalGroupName(politicalGroup);
    return {
      id: `political_group_votes_${politicalGroup.number}`,
      title: title,
      short_title: title,
      subsections: [
        {
          type: "inputGrid",
          headers: [t("number"), t("vote_count"), t("candidate.title.singular")],
          zebra: true,
          rows,
        },
      ],
    };
  });
}

function buildDataEntryStructure(election: ElectionWithPoliticalGroups): DataEntryStructure {
  return [
    extraInvestigationSection,
    countingDifferencesPollingStation,
    votersAndVotesSection,
    differencesSection,
    ...createPoliticalGroupSections(election),
  ];
}

/**
 * Returns all data entry sections.
 *
 * The contents of each section can change depending on the polling station results,
 * but the number of sections and their order do not change.
 *
 * @param election ElectionWithPoliticalGroups object
 * @param _pollingStationResults PollingStationResults object (optional)
 * @returns Complete array of all data entry sections
 */
export function getDataEntryStructure(
  election: ElectionWithPoliticalGroups,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _pollingStationResults?: PollingStationResults,
): DataEntryStructure {
  return buildDataEntryStructure(election);
}

/**
 * Returns all data entry sections for differences rendering (with two data entries).
 *
 * @param election ElectionWithPoliticalGroups object
 * @param _firstEntry First data entry
 * @param _secondEntry Second data entry
 * @returns Complete array of all data entry sections
 */
export function getDataEntryStructureForDifferences(
  election: ElectionWithPoliticalGroups,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _firstEntry: PollingStationResults,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _secondEntry: PollingStationResults,
): DataEntryStructure {
  return buildDataEntryStructure(election);
}
