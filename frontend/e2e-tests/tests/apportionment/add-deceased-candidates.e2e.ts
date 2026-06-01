import { expect } from "@playwright/test";
import { AddDeceasedCandidate } from "e2e-tests/page-objects/apportionment/AddDeceasedCandidatePgObj";
import { ApportionmentFullSeats } from "e2e-tests/page-objects/apportionment/ApportionmentFullSeatsPgObj";
import { ApportionmentListDetails } from "e2e-tests/page-objects/apportionment/ApportionmentListDetailsPgObj";
import { Apportionment } from "e2e-tests/page-objects/apportionment/ApportionmentPgObj";
import { ApportionmentResidualSeats } from "e2e-tests/page-objects/apportionment/ApportionmentResidualSeatsPgObj";
import { DeceasedCandidates } from "e2e-tests/page-objects/apportionment/DeceasedCandidatesPgObj";
import { IncludeAllCandidates } from "e2e-tests/page-objects/apportionment/IncludeAllCandidatesPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { FinishDataEntry } from "e2e-tests/page-objects/election/FinishDataEntryPgObj";
import { test } from "../../fixtures";

test.use({
  storageState: "e2e-tests/state/coordinator1-CSB.json",
});

test.describe("CSB election apportionment", () => {
  test("is calculated after adding deceased candidates", async ({ page, completedElectionCSB }) => {
    await page.goto(`/elections/${completedElectionCSB.id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

    const includeAllCandidatesPage = new IncludeAllCandidates(page);
    await expect(includeAllCandidatesPage.header).toBeVisible();
    await expect(includeAllCandidatesPage.dataEntryFinishedAlert).toBeVisible();
    await expect(includeAllCandidatesPage.title).toBeVisible();
    await expect(includeAllCandidatesPage.yes).toBeVisible();
    await expect(includeAllCandidatesPage.no).toBeVisible();
    await includeAllCandidatesPage.no.click();
    await includeAllCandidatesPage.next.click();

    const addDeceasedCandidatesPage = new AddDeceasedCandidate(page);
    await expect(addDeceasedCandidatesPage.header).toBeVisible();
    await expect(addDeceasedCandidatesPage.title).toBeVisible();
    await addDeceasedCandidatesPage.clickCandidateFromList(5);

    const deceasedCandidatesPage = new DeceasedCandidates(page);
    await expect(deceasedCandidatesPage.header).toBeVisible();
    await expect(deceasedCandidatesPage.findCandidate(1, 5)).toBeVisible();
    await expect(deceasedCandidatesPage.addCandidate).toBeVisible();
    await deceasedCandidatesPage.addCandidate.click();

    await expect(addDeceasedCandidatesPage.header).toBeVisible();
    await expect(addDeceasedCandidatesPage.title).toBeVisible();
    await addDeceasedCandidatesPage.clickList(5);
    await addDeceasedCandidatesPage.clickCandidateFromList(3);

    await expect(deceasedCandidatesPage.header).toBeVisible();
    await expect(deceasedCandidatesPage.findCandidate(1, 5)).toBeVisible();
    await expect(deceasedCandidatesPage.findCandidate(5, 3)).toBeVisible();
    await deceasedCandidatesPage.clickDeleteCandidate(5, 3);
    await expect(deceasedCandidatesPage.findCandidate(1, 5)).toBeVisible();
    await expect(deceasedCandidatesPage.findCandidate(5, 3)).toBeHidden();

    await deceasedCandidatesPage.toApportionment.click();

    const apportionmentPage = new Apportionment(page);
    await expect(apportionmentPage.header).toBeVisible();
    await expect(apportionmentPage.allSeatsAssignedAlert).toBeVisible();

    await expect(apportionmentPage.fullSeatInformation).toBeVisible();
    await apportionmentPage.fullSeatsPageLink.click();
    const apportionmentFullSeatsPage = new ApportionmentFullSeats(page);
    await expect(apportionmentFullSeatsPage.header).toBeVisible();

    await page.goBack();

    await expect(apportionmentPage.residualSeatInformation).toBeVisible();
    await apportionmentPage.residualSeatsPageLink.click();
    const apportionmentResidualSeatsPage = new ApportionmentResidualSeats(page);
    await expect(apportionmentResidualSeatsPage.header).toBeVisible();

    await page.goBack();

    await expect(apportionmentPage.apportionmentTable).toBeVisible();
    await apportionmentPage.clickList(1);

    const listDetailsPage = new ApportionmentListDetails(page);
    await expect(listDetailsPage.header).toBeVisible();
    await expect(listDetailsPage.header).toContainText("Lijst 1 - Partijdige Partij");
    await expect(listDetailsPage.alert).toBeVisible();
    await expect(listDetailsPage.alert).toContainText(
      "Kandidaat 5 is buiten beschouwing gelaten bij het verdelen van de zetels vanwege overlijden.Stemmen op overleden kandidaten zijn wel meegeteld als stemmen op diens lijst.",
    );

    await page.goBack();

    await expect(apportionmentPage.manageDeceasedCandidates).toBeVisible();
    await apportionmentPage.manageDeceasedCandidates.click();

    await expect(deceasedCandidatesPage.header).toBeVisible();
    await expect(deceasedCandidatesPage.findCandidate(1, 5)).toBeVisible();
    await expect(deceasedCandidatesPage.findCandidate(5, 3)).toBeHidden();
    await expect(deceasedCandidatesPage.addCandidate).toBeHidden();
    await expect(deceasedCandidatesPage.resetApportionmentState).toBeVisible();
    await deceasedCandidatesPage.resetApportionmentState.click();

    await expect(includeAllCandidatesPage.header).toBeVisible();
    await expect(includeAllCandidatesPage.dataEntryFinishedAlert).toBeVisible();
    await expect(includeAllCandidatesPage.title).toBeVisible();
  });
});
