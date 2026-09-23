import type { ElectionStatusResponse, ElectionStatusResponseEntry } from "@/types/generated/openapi";

const today = new Date();
today.setHours(10, 20);

export const electionStatusesMock: ElectionStatusResponseEntry[] = [
  {
    data_entry_id: 1,
    source: {
      type: "PollingStation",
      id: 1,
      number: 33,
      name: "Op Rolletjes",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "empty",
  },
  {
    data_entry_id: 2,
    source: {
      type: "PollingStation",
      id: 2,
      number: 34,
      name: "Testplek",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "definitive",
    first_entry_user_id: 2,
    second_entry_user_id: 1,
    finished_at: today.toISOString(),
    finalised_with_warnings: false,
  },
  {
    data_entry_id: 3,
    source: {
      type: "PollingStation",
      id: 3,
      number: 35,
      name: "Testschool",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "entries_different",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
  },
  {
    data_entry_id: 4,
    source: {
      type: "PollingStation",
      id: 4,
      number: 36,
      name: "Testbuurthuis",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "second_entry_in_progress",
    first_entry_user_id: 1,
    second_entry_user_id: 2,
    data_entry_progress: 20,
  },
  {
    data_entry_id: 5,
    source: {
      type: "PollingStation",
      id: 5,
      number: 37,
      name: "Dansschool Oeps nou deed ik het weer",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "first_entry_has_errors",
    first_entry_user_id: 1,
  },
  {
    data_entry_id: 6,
    source: {
      type: "PollingStation",
      id: 6,
      number: 38,
      name: "Testmuseum",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "first_entry_in_progress",
    first_entry_user_id: 2,
    data_entry_progress: 60,
  },
  {
    data_entry_id: 7,
    source: {
      type: "PollingStation",
      id: 7,
      number: 39,
      name: "Test gemeentehuis",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "first_entry_finalised",
    first_entry_user_id: 1,
    finished_at: today.toISOString(),
    finalised_with_warnings: false,
  },
  {
    data_entry_id: 8,
    source: {
      type: "PollingStation",
      id: 8,
      number: 40,
      name: "Test kerk",
      session_type: "First",
      committee_session_id: 1,
      data_entry_id: 1,
      address: "Kerkstraat 1",
      postal_code: "1234 AB",
      locality: "Teststad",
    },
    status: "first_entry_finalised",
    first_entry_user_id: 2,
    finished_at: today.toISOString(),
    finalised_with_warnings: true,
  },
];

export const electionStatusesCSBMock: ElectionStatusResponseEntry[] = [
  {
    data_entry_id: 1203,
    source: {
      type: "SubCommittee",
      committee_session_id: 802,
      id: 812,
      number: 1,
      name: "Juinen",
      category: "GSB",
      data_entry_id: 1203,
      authority_id: "0001",
      authority_name: "Juinen",
    },
    status: "empty",
  },
  {
    data_entry_id: 1204,
    source: {
      type: "SubCommittee",
      committee_session_id: 802,
      id: 813,
      number: 2,
      name: "'s-Gravenveen",
      category: "GSB",
      data_entry_id: 1204,
      authority_id: "0002",
      authority_name: "'s-Gravenveen",
    },
    status: "empty",
  },
  {
    data_entry_id: 1205,
    source: {
      type: "SubCommittee",
      committee_session_id: 802,
      id: 814,
      number: 3,
      name: "Eksterlo",
      category: "GSB",
      data_entry_id: 1205,
      authority_id: "0003",
      authority_name: "Eksterlo",
    },
    status: "empty",
  },
  {
    data_entry_id: 1206,
    source: {
      type: "SubCommittee",
      committee_session_id: 802,
      id: 815,
      number: 4,
      name: "Hovenerwoud",
      category: "GSB",
      data_entry_id: 1206,
      authority_id: "0004",
      authority_name: "Hovenerwoud",
    },
    status: "empty",
  },
  {
    data_entry_id: 1207,
    source: {
      type: "SubCommittee",
      committee_session_id: 802,
      id: 816,
      number: 5,
      name: "Bloemstede",
      category: "GSB",
      data_entry_id: 1207,
      authority_id: "0005",
      authority_name: "Bloemstede",
    },
    status: "empty",
  },
];

/**
 * Return an ElectionStatusResponse with the given statuses supplemented with data_entry_id, source
 * @param statuses array with ElectionStatusResponseEntry objects where only the status is mandatory
 */
export const getElectionStatusMockData = (
  statuses: (Partial<ElectionStatusResponseEntry> & { status: ElectionStatusResponseEntry["status"] })[],
): ElectionStatusResponse => ({
  statuses: statuses.map((status, i) => {
    const { data_entry_id, source } = electionStatusesMock[i]!;
    return {
      data_entry_id,
      source,
      ...status,
    };
  }),
});

export const statusResponseMock: ElectionStatusResponse = {
  statuses: electionStatusesMock,
};

export const CSBStatusResponseMock: ElectionStatusResponse = {
  statuses: electionStatusesCSBMock,
};
