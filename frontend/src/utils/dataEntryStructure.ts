import { t, tx } from "@/i18n/translate";
import { ElectionWithPoliticalGroups, PoliticalGroup } from "@/types/generated/openapi";
import { DataEntryModel, DataEntrySection, DataEntryStructure, InputGridSubsectionRow } from "@/types/types";
import { getCandidateFullName } from "@/utils/candidate";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";

export const createVotersAndVotesSection = (election: ElectionWithPoliticalGroups): DataEntrySection => {
  const rowsPerPoliticalGroup: InputGridSubsectionRow[] = election.political_groups.map((politicalGroup, index) => ({
    code: `E.${politicalGroup.number}`,
    path: `votes_counts.political_group_total_votes[${politicalGroup.number - 1}].total`,
    title: `${t("total")} ${formatPoliticalGroupName(politicalGroup)}`,
    addSeparator: index === election.political_groups.length - 1,
  }));

  return {
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
            addSeparator: true,
          },
          {
            code: "D",
            path: "voters_counts.total_admitted_voters_count",
            title: t("voters_votes_counts.voters_counts.total_admitted_voters_count"),
            isTotal: true,
            addSeparator: true,
          },
          ...rowsPerPoliticalGroup,
          {
            code: "E",
            path: "votes_counts.total_votes_candidates_count",
            title: t("voters_votes_counts.votes_counts.total_votes_candidates_count"),
            isTotal: true,
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
            addSeparator: true,
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
          path: "differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast",
          label: t("differences_counts.admitted_voters_equal_votes_cast.title"),
          short_label: t("differences_counts.admitted_voters_equal_votes_cast.short_title"),
          autoFocusInput: true,
        },
        {
          path: "differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters",
          label: t("differences_counts.votes_cast_greater_than_admitted_voters.title"),
          short_label: t("differences_counts.votes_cast_greater_than_admitted_voters.short_title"),
        },
        {
          path: "differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters",
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
      title: t("extra_investigation.extra_investigation_other_reason.title"),
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
      title: t("extra_investigation.ballots_recounted_extra_investigation.title"),
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
      type: "heading",
      title: t("counting_differences_polling_station.heading_voters_and_votes"),
    },
    {
      type: "checkboxes",
      title: t("counting_differences_polling_station.unexplained_difference_ballots_voters.title"),
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
      type: "heading",
      title: t("counting_differences_polling_station.heading_counts_of_lists"),
    },
    {
      type: "checkboxes",
      title: t("counting_differences_polling_station.difference_ballots_per_list.title"),
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

function buildDataEntryStructure(model: DataEntryModel, election: ElectionWithPoliticalGroups): DataEntryStructure {
  switch (model) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    case "CSOFirstSession":
      return [
        extraInvestigationSection,
        countingDifferencesPollingStation,
        createVotersAndVotesSection(election),
        differencesSection,
        ...createPoliticalGroupSections(election),
      ];
  }
}

/**
 * Returns all data entry sections.
 *
 * @param model Data entry model that determines the structure
 * @param election ElectionWithPoliticalGroups object
 * @returns Complete array of all data entry sections
 */
export function getDataEntryStructure(
  model: DataEntryModel,
  election: ElectionWithPoliticalGroups,
): DataEntryStructure {
  return buildDataEntryStructure(model, election);
}
