import { type Locator, type Page } from "@playwright/test";

interface VotersCounts {
  poll_card_count: string;
  proxy_certificate_count: string;
  voter_card_count: string;
  total_admitted_voters_count: string;
}

interface VotesCounts {
  votes_candidates_counts: string;
  blank_votes_count: string;
  invalid_votes_count: string;
  total_votes_cast_count: string;
}

export class VotersVotesPage {
  protected readonly page: Page;
  readonly pollCardCount: Locator;
  readonly proxyCertificateCount: Locator;
  readonly voterCardCount: Locator;
  readonly totalAdmittedVotersCount: Locator;
  readonly votesCandidatesCount: Locator;
  readonly blankVotesCount: Locator;
  readonly invalidVotesCount: Locator;
  readonly totalVotesCastCount: Locator;

  constructor(page: Page) {
    this.page = page;
    // this.pollCardCount = page.getByLabel("Stempassen")
    // this.pollCardCount = page.getByRole("textbox", {name: "poll_card_count"});
    this.pollCardCount = page.getByTestId("poll_card_count");
    this.proxyCertificateCount = page.getByTestId("proxy_certificate_count");
    this.voterCardCount = page.getByTestId("voter_card_count");
    this.totalAdmittedVotersCount = page.getByTestId("total_admitted_voters_count");
    this.votesCandidatesCount = page.getByTestId("votes_candidates_counts");
    this.blankVotesCount = page.getByTestId("blank_votes_count");
    this.invalidVotesCount = page.getByTestId("invalid_votes_count");
    this.totalVotesCastCount = page.getByTestId("total_votes_cast_count");
  }

  async inputVoters(votersCounts: VotersCounts) {
    await this.pollCardCount.fill(votersCounts.poll_card_count);
    await this.proxyCertificateCount.fill(votersCounts.proxy_certificate_count);
    await this.voterCardCount.fill(votersCounts.voter_card_count);
    await this.totalAdmittedVotersCount.fill(votersCounts.total_admitted_voters_count);
  }

  async inputVotes(votesCounts: VotesCounts) {
    await this.votesCandidatesCount.fill(votesCounts.votes_candidates_counts);
    await this.blankVotesCount.fill(votesCounts.blank_votes_count);
    await this.invalidVotesCount.fill(votesCounts.invalid_votes_count);
    await this.totalVotesCastCount.fill(votesCounts.total_votes_cast_count);
  }
}
