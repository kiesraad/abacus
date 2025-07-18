import { t } from "@/i18n/translate";
import { ElectionWithPoliticalGroups, PoliticalGroup, PollingStationResults } from "@/types/generated/openapi";
import {
  DataEntrySection,
  DataEntryStructure,
  DataEntrySubsection,
  FormSectionId,
  InputGridSubsectionRow,
} from "@/types/types";
import { getCandidateFullName } from "@/utils/candidate";
import { formatPoliticalGroupName } from "@/utils/politicalGroup";

export const recountedSection: DataEntrySection = {
  id: "recounted",
  title: t("recounted.form_title"),
  short_title: t("recounted.short_title"),
  subsections: [
    {
      type: "message",
      message: "recounted.message",
      className: "form-paragraph md",
    },
    {
      type: "radio",
      short_title: "recounted.short_title",
      path: "recounted",
      error: "recounted.error",
      valueType: "boolean",
      options: [
        {
          value: "true",
          label: "recounted.recounted_yes",
          short_label: "recounted.yes",
          autoFocusInput: true,
        },
        { value: "false", label: "recounted.recounted_no", short_label: "recounted.no" },
      ],
    },
  ],
};

export const createVotersAndVotesSection = (recounted: boolean): DataEntrySection => {
  const recountedVotersSubsections: DataEntrySubsection[] = [
    {
      type: "heading",
      title: "voters_votes_counts.admitted_voters_after_recount",
    },
    {
      type: "inputGrid",
      headers: ["field", "counted_number", "description"],
      rows: [
        {
          code: "A.2",
          path: "voters_recounts.poll_card_count",
          title: t("voters_votes_counts.voters_recounts.poll_card_count"),
        },
        {
          code: "B.2",
          path: "voters_recounts.proxy_certificate_count",
          title: t("voters_votes_counts.voters_recounts.proxy_certificate_count"),
        },
        {
          code: "C.2",
          path: "voters_recounts.voter_card_count",
          title: t("voters_votes_counts.voters_recounts.voter_card_count"),
        },
        {
          code: "D.2",
          path: "voters_recounts.total_admitted_voters_count",
          title: t("voters_votes_counts.voters_recounts.total_admitted_voters_count"),
          isTotal: true,
        },
      ],
    },
  ];

  return {
    id: "voters_votes_counts",
    title: t("voters_votes_counts.form_title"),
    short_title: t("voters_votes_counts.short_title"),
    sectionNumber: t("voters_votes_counts.section_number"),
    subsections: [
      {
        type: "inputGrid",
        headers: ["field", "counted_number", "description"],
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
            code: "C",
            path: "voters_counts.voter_card_count",
            title: t("voters_votes_counts.voters_counts.voter_card_count"),
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
      ...(recounted ? recountedVotersSubsections : []),
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
      type: "inputGrid",
      headers: ["field", "counted_number", "description"],
      rows: [
        {
          code: "I",
          path: "differences_counts.more_ballots_count",
          title: t("differences_counts.differences_counts.more_ballots_count"),
          autoFocusInput: true,
        },
        {
          code: "J",
          path: "differences_counts.fewer_ballots_count",
          title: t("differences_counts.differences_counts.fewer_ballots_count"),
          addSeparator: true,
        },
        {
          code: "K",
          path: "differences_counts.unreturned_ballots_count",
          title: t("differences_counts.differences_counts.unreturned_ballots_count"),
        },
        {
          code: "L",
          path: "differences_counts.too_few_ballots_handed_out_count",
          title: t("differences_counts.differences_counts.too_few_ballots_handed_out_count"),
        },
        {
          code: "M",
          path: "differences_counts.too_many_ballots_handed_out_count",
          title: t("differences_counts.differences_counts.too_many_ballots_handed_out_count"),
        },
        {
          code: "N",
          path: "differences_counts.other_explanation_count",
          title: t("differences_counts.differences_counts.other_explanation_count"),
          addSeparator: true,
        },
        {
          code: "O",
          path: "differences_counts.no_explanation_count",
          title: t("differences_counts.differences_counts.no_explanation_count"),
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
      id: `political_group_votes_${politicalGroup.number}` as FormSectionId,
      title: title,
      short_title: title,
      subsections: [
        {
          type: "inputGrid",
          headers: ["number", "vote_count", "candidate.title.singular"],
          zebra: true,
          rows,
        },
      ],
    };
  });
}

function buildDataEntryStructure(election: ElectionWithPoliticalGroups, recounted: boolean): DataEntryStructure {
  return [
    recountedSection,
    createVotersAndVotesSection(recounted),
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
 * @param pollingStationResults PollingStationResults object (optional)
 * @returns Complete array of all data entry sections
 */
export function getDataEntryStructure(
  election: ElectionWithPoliticalGroups,
  pollingStationResults?: PollingStationResults,
): DataEntryStructure {
  return buildDataEntryStructure(election, pollingStationResults?.recounted === true);
}

/**
 * Returns all data entry sections for differences rendering (with two data entries).
 *
 * @param election ElectionWithPoliticalGroups object
 * @param firstEntry First data entry
 * @param secondEntry Second data entry
 * @returns Complete array of all data entry sections
 */
export function getDataEntryStructureForDifferences(
  election: ElectionWithPoliticalGroups,
  firstEntry: PollingStationResults,
  secondEntry: PollingStationResults,
): DataEntryStructure {
  return buildDataEntryStructure(election, firstEntry.recounted || secondEntry.recounted || false);
}
