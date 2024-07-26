import { type Page } from "@playwright/test";

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

  constructor(page: Page) {
    this.page = page;
  }

  async inputVoters(votersCounts: VotersCounts) {
    await this.page.getByTestId("poll_card_count").fill(votersCounts.poll_card_count);
    await this.page
      .getByTestId("proxy_certificate_count")
      .fill(votersCounts.proxy_certificate_count);
    await this.page.getByTestId("voter_card_count").fill(votersCounts.voter_card_count);
    await this.page
      .getByTestId("total_admitted_voters_count")
      .fill(votersCounts.total_admitted_voters_count);
  }

  async inputVotes(votesCounts: VotesCounts) {
    await this.page
      .getByTestId("votes_candidates_counts")
      .fill(votesCounts.votes_candidates_counts);
    await this.page.getByTestId("blank_votes_count").fill(votesCounts.blank_votes_count);
    await this.page.getByTestId("invalid_votes_count").fill(votesCounts.invalid_votes_count);
    await this.page.getByTestId("total_votes_cast_count").fill(votesCounts.total_votes_cast_count);
  }
}
