import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

// ToDo: do toString in method
interface VotersCounts {
  poll_card_count: number;
  proxy_certificate_count: number;
  voter_card_count: number;
  total_admitted_voters_count: number;
}

interface VotesCounts {
  votes_candidates_counts: number;
  blank_votes_count: number;
  invalid_votes_count: number;
  total_votes_cast_count: number;
}

interface VotersRecounts {
  poll_card_recount: number;
  proxy_certificate_recount: number;
  voter_card_recount: number;
  total_admitted_voters_recount: number;
}

export class VotersVotesPage extends InputBasePage {
  readonly heading: Locator;
  readonly headingRecount: Locator;
  readonly pollCardCount: Locator;
  readonly proxyCertificateCount: Locator;
  readonly voterCardCount: Locator;
  readonly totalAdmittedVotersCount: Locator;
  readonly votesCandidatesCount: Locator;
  readonly blankVotesCount: Locator;
  readonly invalidVotesCount: Locator;
  readonly totalVotesCastCount: Locator;
  readonly acceptWarnings: Locator;
  readonly next: Locator;
  readonly pollCardRecount: Locator;
  readonly proxyCertificateRecount: Locator;
  readonly voterCardRecount: Locator;
  readonly totalAdmittedVotersRecount: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", {
      level: 2,
      name: "Toegelaten kiezers en uitgebrachte stemmen",
    });

    this.headingRecount = page.getByRole("heading", {
      level: 2,
      name: "Toegelaten kiezers na hertelling door gemeentelijk stembureau",
    });

    // voters counts
    this.pollCardCount = page.getByTestId("poll_card_count");
    this.proxyCertificateCount = page.getByTestId("proxy_certificate_count");
    this.voterCardCount = page.getByTestId("voter_card_count");
    this.totalAdmittedVotersCount = page.getByTestId("total_admitted_voters_count");

    // votes counts
    this.votesCandidatesCount = page.getByTestId("votes_candidates_counts");
    this.blankVotesCount = page.getByTestId("blank_votes_count");
    this.invalidVotesCount = page.getByTestId("invalid_votes_count");
    this.totalVotesCastCount = page.getByTestId("total_votes_cast_count");

    // voters recounts
    this.pollCardRecount = page.getByTestId("poll_card_recount");
    this.proxyCertificateRecount = page.getByTestId("proxy_certificate_recount");
    this.voterCardRecount = page.getByTestId("voter_card_recount");
    this.totalAdmittedVotersRecount = page.getByTestId("total_admitted_voters_recount");

    this.acceptWarnings = page.getByLabel(
      "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
    );

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async inputVotersCounts(votersCounts: VotersCounts) {
    await this.pollCardCount.fill(votersCounts.poll_card_count.toString());
    await this.proxyCertificateCount.fill(votersCounts.proxy_certificate_count.toString());
    await this.voterCardCount.fill(votersCounts.voter_card_count.toString());
    await this.totalAdmittedVotersCount.fill(votersCounts.total_admitted_voters_count.toString());
  }

  async inputVotesCounts(votesCounts: VotesCounts) {
    await this.votesCandidatesCount.fill(votesCounts.votes_candidates_counts.toString());
    await this.blankVotesCount.fill(votesCounts.blank_votes_count.toString());
    await this.invalidVotesCount.fill(votesCounts.invalid_votes_count.toString());
    await this.totalVotesCastCount.fill(votesCounts.total_votes_cast_count.toString());
  }

  async inputVotersRecounts(votersRecounts: VotersRecounts) {
    await this.pollCardRecount.fill(votersRecounts.poll_card_recount.toString());
    await this.proxyCertificateRecount.fill(votersRecounts.proxy_certificate_recount.toString());
    await this.voterCardRecount.fill(votersRecounts.voter_card_recount.toString());
    await this.totalAdmittedVotersRecount.fill(
      votersRecounts.total_admitted_voters_recount.toString(),
    );
  }

  async fillInPageAndClickNext(
    votersCounts: VotersCounts,
    votesCounts: VotesCounts,
    votersRecounts?: VotersRecounts,
  ) {
    await this.inputVotersCounts(votersCounts);
    await this.inputVotesCounts(votesCounts);
    if (votersRecounts) {
      await this.inputVotersRecounts(votersRecounts);
    }
    await this.next.click();
  }
}
