import { type Locator, type Page } from "@playwright/test";

import { VotersCounts, VotesCounts } from "@/types/generated/openapi";

import { DataEntryBasePage } from "./DataEntryBasePgObj";

export class VotersAndVotesPage extends DataEntryBasePage {
  readonly fieldset: Locator;
  readonly headingRecount: Locator;
  readonly pollCardCount: Locator;
  readonly proxyCertificateCount: Locator;
  readonly totalAdmittedVotersCount: Locator;
  readonly votesCandidatesCount: Locator;
  readonly blankVotesCount: Locator;
  readonly invalidVotesCount: Locator;
  readonly totalVotesCastCount: Locator;
  readonly acceptErrorsAndWarnings: Locator;
  readonly acceptErrorsAndWarningsReminder: Locator;
  readonly next: Locator;

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
    this.totalAdmittedVotersCount = page.getByRole("textbox", { name: "D Totaal toegelaten kiezers" });

    // votes counts
    this.votesCandidatesCount = page.getByRole("textbox", { name: "E Stemmen op kandidaten" });
    this.blankVotesCount = page.getByRole("textbox", { name: "F Blanco stemmen" });
    this.invalidVotesCount = page.getByRole("textbox", { name: "G Ongeldige stemmen" });
    this.totalVotesCastCount = page.getByRole("textbox", { name: "H Totaal uitgebrachte stemmen" });

    this.acceptErrorsAndWarnings = page.getByLabel(
      "Ik heb mijn invoer gecontroleerd met het papier en correct overgenomen.",
    );
    this.acceptErrorsAndWarningsReminder = page
      .getByRole("alert")
      .filter({ hasText: "Je kan alleen verder als je het papieren proces-verbaal hebt gecontroleerd." });

    this.next = page.getByRole("button", { name: "Volgende" });
  }

  async inputVotersCounts(votersCounts: VotersCounts) {
    await this.pollCardCount.fill(votersCounts.poll_card_count.toString());
    await this.proxyCertificateCount.fill(votersCounts.proxy_certificate_count.toString());
    await this.totalAdmittedVotersCount.fill(votersCounts.total_admitted_voters_count.toString());
  }

  async getVotersCounts(): Promise<VotersCounts> {
    return {
      // using Number() so that "" is parsed to 0
      poll_card_count: Number(await this.pollCardCount.inputValue()),
      proxy_certificate_count: Number(await this.proxyCertificateCount.inputValue()),
      total_admitted_voters_count: Number(await this.totalAdmittedVotersCount.inputValue()),
    };
  }

  async inputVotesCounts(votesCounts: VotesCounts) {
    await this.votesCandidatesCount.fill(votesCounts.votes_candidates_count.toString());
    await this.blankVotesCount.fill(votesCounts.blank_votes_count.toString());
    await this.invalidVotesCount.fill(votesCounts.invalid_votes_count.toString());
    await this.totalVotesCastCount.fill(votesCounts.total_votes_cast_count.toString());
  }

  async getVotesCounts(): Promise<VotesCounts> {
    return {
      // using Number() so that "" is parsed to 0
      votes_candidates_count: Number(await this.votesCandidatesCount.inputValue()),
      blank_votes_count: Number(await this.blankVotesCount.inputValue()),
      invalid_votes_count: Number(await this.invalidVotesCount.inputValue()),
      total_votes_cast_count: Number(await this.totalVotesCastCount.inputValue()),
    };
  }

  async getVotersAndVotesCounts(): Promise<{ voters: VotersCounts; votes: VotesCounts }> {
    return {
      voters: await this.getVotersCounts(),
      votes: await this.getVotesCounts(),
    };
  }

  async fillInPageAndClickNext(votersCounts: VotersCounts, votesCounts: VotesCounts) {
    await this.inputVotersCounts(votersCounts);
    await this.inputVotesCounts(votesCounts);
    await this.next.click();
  }

  async checkAcceptErrorsAndWarnings() {
    await this.acceptErrorsAndWarnings.waitFor();
    await this.acceptErrorsAndWarnings.check();
  }
}
