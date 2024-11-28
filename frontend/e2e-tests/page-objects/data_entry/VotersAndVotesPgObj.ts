import { type Locator, type Page } from "@playwright/test";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export interface VotersCounts {
  poll_card_count: number;
  proxy_certificate_count: number;
  voter_card_count: number;
  total_admitted_voters_count: number;
}

export interface VotesCounts {
  votes_candidates_count: number;
  blank_votes_count: number;
  invalid_votes_count: number;
  total_votes_cast_count: number;
}

export interface VotersRecounts {
  poll_card_recount: number;
  proxy_certificate_recount: number;
  voter_card_recount: number;
  total_admitted_voters_recount: number;
}

export class VotersAndVotesPage extends DataEntryBasePage {
  readonly fieldset: Locator;
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

    this.fieldset = page.getByRole("group", {
      name: "Toegelaten kiezers en uitgebrachte stemmen",
    });

    this.headingRecount = page.getByRole("heading", {
      level: 2,
      name: "Toegelaten kiezers na hertelling door gemeentelijk stembureau",
    });

    // voters counts
    this.pollCardCount = page.getByRole("textbox", { name: "A Stempassen" });
    this.proxyCertificateCount = page.getByRole("textbox", { name: "B Volmachtbewijzen" });
    this.voterCardCount = page.getByRole("textbox", { name: "C Kiezerspassen" });
    this.totalAdmittedVotersCount = page.getByRole("textbox", { name: "D Totaal toegelaten kiezers" });

    // votes counts
    this.votesCandidatesCount = page.getByRole("textbox", { name: "E Stemmen op kandidaten" });
    this.blankVotesCount = page.getByRole("textbox", { name: "F Blanco stemmen" });
    this.invalidVotesCount = page.getByRole("textbox", { name: "G Ongeldige stemmen" });
    this.totalVotesCastCount = page.getByRole("textbox", { name: "H Totaal uitgebrachte stemmen" });

    // voters recounts
    this.pollCardRecount = page.getByRole("textbox", { name: "A.2 Stempassen" });
    this.proxyCertificateRecount = page.getByRole("textbox", { name: "B.2 Volmachtbewijzen" });
    this.voterCardRecount = page.getByRole("textbox", { name: "C.2 Kiezerspassen" });
    this.totalAdmittedVotersRecount = page.getByRole("textbox", { name: "D.2 Totaal toegelaten kiezers" });

    this.acceptWarnings = page.getByLabel("Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.");

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async inputVotersCounts(votersCounts: VotersCounts) {
    await this.pollCardCount.fill(votersCounts.poll_card_count.toString());
    await this.proxyCertificateCount.fill(votersCounts.proxy_certificate_count.toString());
    await this.voterCardCount.fill(votersCounts.voter_card_count.toString());
    await this.totalAdmittedVotersCount.fill(votersCounts.total_admitted_voters_count.toString());
  }

  async inputVotesCounts(votesCounts: VotesCounts) {
    await this.votesCandidatesCount.fill(votesCounts.votes_candidates_count.toString());
    await this.blankVotesCount.fill(votesCounts.blank_votes_count.toString());
    await this.invalidVotesCount.fill(votesCounts.invalid_votes_count.toString());
    await this.totalVotesCastCount.fill(votesCounts.total_votes_cast_count.toString());
  }

  async inputVotersRecounts(votersRecounts: VotersRecounts) {
    await this.pollCardRecount.fill(votersRecounts.poll_card_recount.toString());
    await this.proxyCertificateRecount.fill(votersRecounts.proxy_certificate_recount.toString());
    await this.voterCardRecount.fill(votersRecounts.voter_card_recount.toString());
    await this.totalAdmittedVotersRecount.fill(votersRecounts.total_admitted_voters_recount.toString());
  }

  async fillInPageAndClickNext(votersCounts: VotersCounts, votesCounts: VotesCounts, votersRecounts?: VotersRecounts) {
    await this.inputVotersCounts(votersCounts);
    await this.inputVotesCounts(votesCounts);
    if (votersRecounts) {
      await this.inputVotersRecounts(votersRecounts);
    }
    await this.next.click();
  }

  async checkAcceptWarnings() {
    await this.acceptWarnings.waitFor();
    await this.acceptWarnings.check();
  }
}
