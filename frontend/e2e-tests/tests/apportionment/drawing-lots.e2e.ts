import { expect } from "@playwright/test";
import { ApportionmentListDetails } from "e2e-tests/page-objects/apportionment/ApportionmentListDetailsPgObj";
import { Apportionment } from "e2e-tests/page-objects/apportionment/ApportionmentPgObj";
import { ApportionmentResidualSeats } from "e2e-tests/page-objects/apportionment/ApportionmentResidualSeatsPgObj";
import { DrawingLots } from "e2e-tests/page-objects/apportionment/DrawingLotsPgObj";
import { IncludeAllCandidates } from "e2e-tests/page-objects/apportionment/IncludeAllCandidatesPgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { FinishDataEntry } from "e2e-tests/page-objects/election/FinishDataEntryPgObj";
import { test } from "../../fixtures";

test.describe("CSB election apportionment", () => {
  test("is calculated after drawing lots for lists and candidates", async ({
    coordinatorOneCSB,
    completedElectionCSBWithDrawingLotsForListAndCandidate,
  }) => {
    const page = coordinatorOneCSB.page;
    await page.goto(`/elections/${completedElectionCSBWithDrawingLotsForListAndCandidate.id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

    const includeAllCandidatesPage = new IncludeAllCandidates(page);
    await expect(includeAllCandidatesPage.header).toBeVisible();
    await expect(includeAllCandidatesPage.dataEntryFinishedAlert).toBeVisible();
    await expect(includeAllCandidatesPage.title).toBeVisible();
    await expect(includeAllCandidatesPage.noDeceased).toBeVisible();
    await expect(includeAllCandidatesPage.hasDeceased).toBeVisible();
    await includeAllCandidatesPage.noDeceased.check();
    await includeAllCandidatesPage.next.click();

    const apportionmentPage = new Apportionment(page);
    await expect(apportionmentPage.header).toBeVisible();
    await expect(apportionmentPage.preliminaryResult).toBeVisible();
    await expect(apportionmentPage.drawingLotsForListNeededAlert).toBeVisible();
    await expect(apportionmentPage.toResidualSeatAllocationDetails).toBeVisible();
    await apportionmentPage.toResidualSeatAllocationDetails.click();
    const apportionmentResidualSeatsPage = new ApportionmentResidualSeats(page);
    await expect(apportionmentResidualSeatsPage.header).toBeVisible();
    await expect(apportionmentResidualSeatsPage.drawingLotsForListNeededAlert).toBeVisible();
    await expect(apportionmentResidualSeatsPage.toDrawingLots).toBeVisible();

    await page.goBack();

    await expect(apportionmentPage.toDrawingLots).toBeVisible();
    await apportionmentPage.toDrawingLots.click();
    const drawingLotsPage = new DrawingLots(page);
    await expect(drawingLotsPage.getHeaderByName("Loting voor restzetel 6")).toBeVisible();
    await expect(drawingLotsPage.title).toBeVisible();
    await expect(drawingLotsPage.list).toBeVisible();
    await expect(drawingLotsPage.getListItemByText("Er zijn 6 restzetels te verdelen")).toBeVisible();
    await expect(drawingLotsPage.getListItemByText("Restzetel 6 kan niet automatisch worden toegewezen")).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText(
        "De partij met het hoogste gemiddeld aantal stemmen bij het toewijzen van de restzetel krijgt de restzetel",
      ),
    ).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText(
        "Lijst 2 – Partij voor de Stemmer en Lijst 3 – Stemmmers 22 hebben ieder het hoogste gemiddeld aantal stemmen per zetel (5.000 stemmen)",
      ),
    ).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText("Daarom moet er geloot worden welke lijst de restzetel krijgt"),
    ).toBeVisible();
    await expect(drawingLotsPage.instructions).toBeVisible();
    await expect(drawingLotsPage.result).toBeVisible();
    const listOption1 = drawingLotsPage.getOptionByName("Lijst 2 – Partij voor de Stemmer");
    const listOption2 = drawingLotsPage.getOptionByName("Lijst 3 – Stemmmers 22");
    await expect(listOption1).toBeVisible();
    await expect(listOption2).toBeVisible();
    await listOption2.check();
    await drawingLotsPage.next.click();

    await expect(apportionmentPage.header).toBeVisible();
    await expect(apportionmentPage.preliminaryResult).toBeVisible();
    await expect(
      apportionmentPage.getAlertByText(
        "Restzetel 6 kon niet automatisch worden toegewezen en is na loting toegekend aan Lijst 3 – Stemmmers 22 (er is geloot tussen lijst 2 en 3).",
      ),
    ).toBeVisible();

    await expect(apportionmentPage.drawingLotsForCandidateNeededAlert).toBeVisible();
    await expect(apportionmentPage.toDrawingLots).toBeVisible();
    await apportionmentPage.toDrawingLots.click();

    await expect(drawingLotsPage.getHeaderByName("Loting voor kandidaten met evenveel stemmen")).toBeVisible();
    await expect(drawingLotsPage.title).toBeVisible();
    await expect(drawingLotsPage.list).toBeVisible();
    await expect(drawingLotsPage.getListItemByText("Lijst 2 – Partij voor de Stemmer heeft 1 zetel")).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText(
        "Er zijn 4 kandidaten die op basis van hun voorkeursstemmen in aanmerking komen voor zetel 1. Zij hebben allen 2500 stemmen. Het gaat om de kandidaten:",
      ),
    ).toBeVisible();
    await expect(drawingLotsPage.getListItemByText("Daarom moet er geloot worden wie zetel 1 krijgt")).toBeVisible();
    await expect(drawingLotsPage.instructions).toBeVisible();
    await expect(drawingLotsPage.result).toBeVisible();
    const candidateOption1 = drawingLotsPage.getOptionByName("1. Van der Spek, C.P.M. (Charèl)");
    const candidateOption2 = drawingLotsPage.getOptionByName("2. Arets, W.P. (Tjeu)");
    const candidateOption3 = drawingLotsPage.getOptionByName("3. Van den Arets, X.T. (Xuan)");
    const candidateOption4 = drawingLotsPage.getOptionByName("4. Van den Eijnden, F.M. (Frédérique)");
    await expect(candidateOption1).toBeVisible();
    await expect(candidateOption2).toBeVisible();
    await expect(candidateOption3).toBeVisible();
    await expect(candidateOption4).toBeVisible();
    await candidateOption3.check();
    await drawingLotsPage.next.click();

    await expect(apportionmentPage.header).toBeVisible();
    await expect(apportionmentPage.allSeatsAssignedAlert).toBeVisible();
    await expect(apportionmentPage.toReport).toBeVisible();
    await expect(apportionmentPage.apportionment).toBeVisible();
    // Alert with drawing lots for list result is still visible
    await expect(
      apportionmentPage.getAlertByText(
        "Restzetel 6 kon niet automatisch worden toegewezen en is na loting toegekend aan Lijst 3 – Stemmmers 22 (er is geloot tussen lijst 2 en 3).",
      ),
    ).toBeVisible();
    await expect(apportionmentPage.apportionmentTable).toBeVisible();
    await apportionmentPage.clickList(2);

    const listDetailsPage = new ApportionmentListDetails(page);
    await expect(listDetailsPage.header).toBeVisible();
    await expect(listDetailsPage.header).toContainText("Lijst 2 – Partij voor de Stemmer");
    await expect(listDetailsPage.alert).toBeVisible();
    await expect(listDetailsPage.alert).toContainText(
      "Zetel 1 is na loting toegewezen aan Kandidaat 3 – Van den Arets, X.T. (Xuan) (er is geloot tussen kandidaat 1, 2, 3 en 4)",
    );
  });

  test("is calculated after drawing lots for absolute majority reassignment", async ({
    coordinatorOneCSB,
    completedElectionCSBWithDrawingLotsForP9,
  }) => {
    const page = coordinatorOneCSB.page;
    await page.goto(`/elections/${completedElectionCSBWithDrawingLotsForP9.id}/status`);

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

    const includeAllCandidatesPage = new IncludeAllCandidates(page);
    await expect(includeAllCandidatesPage.header).toBeVisible();
    await expect(includeAllCandidatesPage.dataEntryFinishedAlert).toBeVisible();
    await expect(includeAllCandidatesPage.title).toBeVisible();
    await expect(includeAllCandidatesPage.noDeceased).toBeVisible();
    await expect(includeAllCandidatesPage.hasDeceased).toBeVisible();
    await includeAllCandidatesPage.noDeceased.check();
    await includeAllCandidatesPage.next.click();

    const apportionmentPage = new Apportionment(page);
    await expect(apportionmentPage.header).toBeVisible();
    await expect(apportionmentPage.preliminaryResult).toBeVisible();
    await expect(
      apportionmentPage.getAlertByText("Lijst 2, 3 of 4 moet een zetel afstaan aan lijst 1. Ga naar loting"),
    ).toBeVisible();
    await expect(apportionmentPage.drawingLotsForP9NeededAlert).toBeVisible();
    await expect(apportionmentPage.toResidualSeatAllocationDetails).toBeVisible();
    await apportionmentPage.toResidualSeatAllocationDetails.click();
    const apportionmentResidualSeatsPage = new ApportionmentResidualSeats(page);
    await expect(apportionmentResidualSeatsPage.header).toBeVisible();
    await expect(apportionmentResidualSeatsPage.drawingLotsForP9NeededAlert).toBeVisible();
    await expect(apportionmentResidualSeatsPage.toDrawingLots).toBeVisible();

    await page.goBack();

    await expect(apportionmentPage.toDrawingLots).toBeVisible();
    await apportionmentPage.toDrawingLots.click();
    const drawingLotsPage = new DrawingLots(page);
    await expect(drawingLotsPage.getHeaderByName("Loting voor afstaan restzetel aan lijst 1")).toBeVisible();
    await expect(drawingLotsPage.title).toBeVisible();
    await expect(drawingLotsPage.list).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText(
        "Lijst 1 heeft de volstrekte meerderheid van stemmen gekregen, maar heeft niet de volstrekte meerderheid aan zetels.",
      ),
    ).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText("De laatste restzetel moet worden afgestaan aan lijst 1."),
    ).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText(
        "Lijst 2, 3 en 4 hebben met hetzelfde overschot aan stemmen de laatste restzetels gekregen.",
      ),
    ).toBeVisible();
    await expect(
      drawingLotsPage.getListItemByText("Daarom moet er geloot worden welke lijst de restzetel moet afstaan"),
    ).toBeVisible();
    await expect(drawingLotsPage.instructions).toBeVisible();
    await expect(drawingLotsPage.result).toBeVisible();
    const listOption1 = drawingLotsPage.getOptionByName("Lijst 2 – Partij voor de Stemmer");
    const listOption2 = drawingLotsPage.getOptionByName("Lijst 3 – Stemmmers 22");
    const listOption3 = drawingLotsPage.getOptionByName("Lijst 4 – STEM");
    await expect(listOption1).toBeVisible();
    await expect(listOption2).toBeVisible();
    await expect(listOption3).toBeVisible();
    await listOption3.check();
    await drawingLotsPage.next.click();

    await expect(apportionmentPage.header).toBeVisible();
    await expect(apportionmentPage.allSeatsAssignedAlert).toBeVisible();
    await expect(apportionmentPage.toReport).toBeVisible();
    await expect(apportionmentPage.apportionment).toBeVisible();
    await expect(
      apportionmentPage.getAlertByText(
        "De laatste restzetel voor lijst 1 (artikel P 9) is na loting afgestaan door Lijst 4 – STEM (er is geloot tussen lijst 2, 3 en 4)",
      ),
    ).toBeVisible();
    await expect(apportionmentPage.apportionmentTable).toBeVisible();
  });
});
