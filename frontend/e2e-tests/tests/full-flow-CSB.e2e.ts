import { expect, request } from "@playwright/test";
import { test } from "e2e-tests/fixtures";
import { apiLogout, createUser, firstLogin, getTestPassword } from "e2e-tests/helpers-utils/e2e-test-api-helpers";
import {
  fillDataEntryPagesAndSave,
  logout,
  uploadCandidatesAndInputHash,
  uploadElectionAndInputHash,
} from "e2e-tests/helpers-utils/e2e-test-browser-helpers";
import { ApportionmentFullSeats } from "e2e-tests/page-objects/apportionment/ApportionmentFullSeatsPgObj";
import { Apportionment } from "e2e-tests/page-objects/apportionment/ApportionmentPgObj";
import { ApportionmentResidualSeats } from "e2e-tests/page-objects/apportionment/ApportionmentResidualSeatsPgObj";
import { AccountSetupPgObj } from "e2e-tests/page-objects/authentication/AccountSetupPgObj";
import { LoginPgObj } from "e2e-tests/page-objects/authentication/LoginPgObj";
import { DataEntryHomePage } from "e2e-tests/page-objects/data_entry/DataEntryHomePgObj";
import { CheckAndSavePgObj } from "e2e-tests/page-objects/election/create/CheckAndSavePgObj";
import { CommitteeCategoryPgObj } from "e2e-tests/page-objects/election/create/CommitteeCategoryPgObj.ts";
import { ElectionDetailsPgObj } from "e2e-tests/page-objects/election/ElectionDetailsPgObj";
import { ElectionHome } from "e2e-tests/page-objects/election/ElectionHomePgObj";
import { ElectionStatus } from "e2e-tests/page-objects/election/ElectionStatusPgObj";
import { ElectionsOverviewPgObj } from "e2e-tests/page-objects/election/ElectionsOverviewPgObj";
import { FinishDataEntry } from "e2e-tests/page-objects/election/FinishDataEntryPgObj";
import { AdminNavBar } from "e2e-tests/page-objects/nav_bar/AdminNavBarPgObj";
import { UserInfoTopBar } from "e2e-tests/page-objects/nav_bar/UserInfoTopBarPgObj";
import { UserCreateDetailsPgObj } from "e2e-tests/page-objects/users/UserCreateDetailsPgObj";
import { UserCreateElectionPgObj } from "e2e-tests/page-objects/users/UserCreateElectionPgObj";
import { UserCreateRolePgObj } from "e2e-tests/page-objects/users/UserCreateRolePgObj";
import { UserCreateTypePgObj } from "e2e-tests/page-objects/users/UserCreateTypePgObj";
import { UserListPgObj } from "e2e-tests/page-objects/users/UserListPgObj";
import { eml230b_more_than_45_candidates } from "e2e-tests/test-data/eml-files";
import { noRecountNoDifferencesDataEntryGSB } from "e2e-tests/test-data/request-response-templates";
import type { TestUser } from "e2e-tests/test-data/users";

// Note: Do not use the randomSuffix in test titles. You cannot interpolate a non-static value.
// Using the randomSuffix in test titles will result in those tests being executed last.
const randomSuffix = Date.now();

const adminUser: TestUser = {
  username: `admin1-CSB-${randomSuffix}`,
  fullname: `full flow admin1 CSB`,
  role: "administrator",
};

const coordinatorUser: TestUser = {
  username: `coordinator1-CSB-${randomSuffix}`,
  fullname: `full flow coordinator1 CSB`,
  role: "coordinator_csb",
};

const typistUsers: TestUser[] = [
  {
    username: `typist1-CSB-${randomSuffix}`,
    fullname: `full flow typist1 CSB`,
    role: "typist_csb",
  },
  {
    username: `typist2-CSB-${randomSuffix}`,
    fullname: `full flow typist2 CSB`,
    role: "typist_csb",
  },
];

test.describe.configure({ mode: "serial" });

test.describe("full flow CSB", () => {
  let electionId: number | null = null;

  test("create and complete admin user account", async ({ adminOne }) => {
    const { request: adminOneContext } = adminOne;

    await createUser(adminOneContext, adminUser);

    const newAdminContext = await request.newContext();
    await firstLogin(newAdminContext, adminUser);
    const logoutResponse = await apiLogout(newAdminContext);
    expect(logoutResponse.status()).toBe(204);
  });

  test("create CSB election", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login(adminUser.username, getTestPassword(adminUser.username));

    const electionsOverviewPage = new ElectionsOverviewPgObj(page);
    await electionsOverviewPage.create.click();

    await uploadElectionAndInputHash(page);

    const committeeCategoryPage = new CommitteeCategoryPgObj(page);
    await expect(committeeCategoryPage.header).toBeVisible();
    await committeeCategoryPage.csb.click();
    await expect(committeeCategoryPage.csb).toBeChecked();
    await committeeCategoryPage.next.click();

    await uploadCandidatesAndInputHash(page, eml230b_more_than_45_candidates);

    const checkAndSavePage = new CheckAndSavePgObj(page);
    await expect(checkAndSavePage.header).toBeVisible();
    await expect(checkAndSavePage.committeeCategory).toHaveText("type stembureau: Centraal stembureau");
    const election = await checkAndSavePage.saveElection();

    electionId = election.id;

    await expect(electionsOverviewPage.adminHeader).toBeVisible();
    await expect(electionsOverviewPage.alertCSBElectionCreated).toBeVisible();
    await electionsOverviewPage.findElectionRowById(electionId).click();

    const electionHomePage = new ElectionHome(page);
    await expect(electionHomePage.header).toHaveText("Gemeenteraad Test 2022");
    const sessionCard = electionHomePage.getCommitteeSessionCard(1);
    await expect(sessionCard).toContainText("Zitting CSB — Klaar voor invoer");

    await logout(page);
  });

  test("create coordinator user account", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login(adminUser.username, getTestPassword(adminUser.username));

    const userInfoTopBar = new UserInfoTopBar(page);
    await expect(userInfoTopBar.username).toHaveText(adminUser.fullname);

    const adminNavBar = new AdminNavBar(page);
    await adminNavBar.users.click();

    const userListPgObj = new UserListPgObj(page);
    await userListPgObj.create.click();

    const userCreateRolePgObj = new UserCreateRolePgObj(page);
    await userCreateRolePgObj.coordinator.click();
    await userCreateRolePgObj.continue.click();

    const userCreateElectionPgObj = new UserCreateElectionPgObj(page);
    await userCreateElectionPgObj.csb.click();
    await userCreateElectionPgObj.continue.click();

    const userCreateDetailsPgObj = new UserCreateDetailsPgObj(page);
    await userCreateDetailsPgObj.createNamedUser(
      coordinatorUser.username,
      coordinatorUser.fullname,
      getTestPassword(coordinatorUser.username, "Temp"),
    );

    await expect(userListPgObj.alert).toContainText(`${coordinatorUser.username} is toegevoegd met de rol Coördinator`);

    await logout(page);
  });

  test("complete coordinator user account", async ({ page }) => {
    await page.goto("/account/login");
    const loginPage = new LoginPgObj(page);
    await loginPage.login(coordinatorUser.username, getTestPassword(coordinatorUser.username, "Temp"));

    const password = getTestPassword(coordinatorUser.username);
    const accountSetupPage = new AccountSetupPgObj(page);
    await accountSetupPage.password.fill(password);
    await accountSetupPage.passwordRepeat.fill(password);
    await accountSetupPage.saveBtn.click();

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.alertAccountSetup).toBeVisible();

    await logout(page);
  });

  test("create typist user accounts", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login(adminUser.username, getTestPassword(adminUser.username));

    const userInfoTopBar = new UserInfoTopBar(page);
    await expect(userInfoTopBar.username).toHaveText(adminUser.fullname);

    for (const typist of typistUsers) {
      const adminNavBar = new AdminNavBar(page);
      await adminNavBar.users.click();

      const userListPgObj = new UserListPgObj(page);
      await userListPgObj.create.click();

      const userCreateRolePgObj = new UserCreateRolePgObj(page);
      await userCreateRolePgObj.typist.click();
      await userCreateRolePgObj.continue.click();

      const userCreateElectionPgObj = new UserCreateElectionPgObj(page);
      await userCreateElectionPgObj.csb.click();
      await userCreateElectionPgObj.continue.click();

      const userCreateTypePgObj = new UserCreateTypePgObj(page);
      await userCreateTypePgObj.continue.click();

      const userCreateDetailsPgObj = new UserCreateDetailsPgObj(page);
      await userCreateDetailsPgObj.createNamedUser(typist.username, typist.fullname, typist.username.repeat(3));
      await expect(userListPgObj.alert).toContainText(`${typist.username} is toegevoegd met de rol Invoerder`);
    }
    await logout(page);
  });

  test("start data entry", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login(coordinatorUser.username, getTestPassword(coordinatorUser.username));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionHome = new ElectionHome(page);
    await expect(electionHome.header).toHaveText("Gemeenteraad Test 2022");
    await expect(electionHome.getCommitteeSessionCard(1)).toContainText("Zitting CSB");
    await electionHome.detailsButton.click();

    const electionDetails = new ElectionDetailsPgObj(page);
    await expect(electionDetails.header).toHaveText("Centraal stembureau Test");
    await electionDetails.fillForm("Pannerdam", "18-03-2026", "21:34");

    await expect(electionHome.header).toContainText("Gemeenteraad Test 2022");
    await expect(page.getByText("Begon op 18 maart 2026 om 21:34")).toBeVisible();
    await electionHome.startButton.click();

    const electionStatus = new ElectionStatus(page);
    await expect(electionStatus.header).toContainText("Zitting CSB");

    await logout(page);
  });

  for (const typist of typistUsers) {
    test(`complete user account for ${typist.fullname}`, async ({ page }) => {
      await page.goto("/account/login");
      const loginPage = new LoginPgObj(page);
      await loginPage.login(typist.username, typist.username.repeat(3));

      const password = getTestPassword(typist.username);
      const accountSetupPage = new AccountSetupPgObj(page);
      await accountSetupPage.password.fill(password);
      await accountSetupPage.passwordRepeat.fill(password);
      await accountSetupPage.saveBtn.click();

      const overviewPage = new ElectionsOverviewPgObj(page);
      await expect(overviewPage.alertAccountSetup).toBeVisible();

      await logout(page);
    });
  }

  test("first data entry", async ({ page }) => {
    await page.goto("/account/login");

    const firstTypist = typistUsers[0]!;
    const loginPage = new LoginPgObj(page);
    const password = getTestPassword(firstTypist.username);
    await loginPage.login(firstTypist.username, password);

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await expect(dataEntryHomePage.pollingStations).toBeVisible();
    await dataEntryHomePage.clickPollingStationFromList(0);

    await fillDataEntryPagesAndSave(page, noRecountNoDifferencesDataEntryGSB);
    await expect(dataEntryHomePage.alertDataEntrySaved).toBeVisible();

    await logout(page);
  });

  test("second data entry", async ({ page }) => {
    await page.goto("/account/login");

    const secondTypist = typistUsers[1]!;
    const loginPage = new LoginPgObj(page);
    await loginPage.login(secondTypist.username, getTestPassword(secondTypist.username));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const dataEntryHomePage = new DataEntryHomePage(page);
    await expect(dataEntryHomePage.fieldset).toBeVisible();
    await expect(dataEntryHomePage.pollingStations).toBeVisible();
    await dataEntryHomePage.clickPollingStationFromList(0);

    await fillDataEntryPagesAndSave(page, noRecountNoDifferencesDataEntryGSB);
    await expect(dataEntryHomePage.alertDataEntrySaved).toBeVisible();

    await logout(page);
  });

  test("finish session, check apportionment and download results", async ({ page }) => {
    await page.goto("/account/login");

    const loginPage = new LoginPgObj(page);
    await loginPage.login(coordinatorUser.username, getTestPassword(coordinatorUser.username));

    const overviewPage = new ElectionsOverviewPgObj(page);
    await expect(overviewPage.header).toBeVisible();
    await overviewPage.findElectionRowById(electionId!).click();

    const electionHomePage = new ElectionHome(page);
    await expect(electionHomePage.header).toHaveText("Gemeenteraad Test 2022");
    const sessionCard = electionHomePage.getCommitteeSessionCard(1);
    await expect(sessionCard).toContainText("Zitting CSB — Invoer bezig");
    await electionHomePage.statusButton.click();

    const electionStatusPage = new ElectionStatus(page);
    await electionStatusPage.finish.click();

    const finishDataEntryPage = new FinishDataEntry(page);
    await finishDataEntryPage.finishDataEntry.click();

    const apportionmentPage = new Apportionment(page);
    await expect(apportionmentPage.header).toBeVisible();

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
    // TODO: #3160 adjust when apportionment deceased candidate flow is implemented
    // await expect(apportionmentPage.allSeatsAssignedAlert).toBeVisible();
    // await apportionmentPage.toReport.click();

    // const electionReportPage = new ElectionReport(page);

    // const resultsDownloadPromise = page.waitForEvent("download");
    // await electionReportPage.downloadCSBResultsZip.click();
    // const resultsDownload = await resultsDownloadPromise;
    // expect(resultsDownload.suggestedFilename()).toMatch(
    //   /vaststelling-uitslag_gr2022_test_gemeente_test-\d{8}-\d{6}.zip/,
    // );
    // expect((await stat(await resultsDownload.path())).size).toBeGreaterThan(1024);

    // const attachmentDownloadPromise = page.waitForEvent("download");
    // await electionReportPage.downloadCSBAttachmentZip.click();
    // const attachmentDownload = await attachmentDownloadPromise;
    // expect(attachmentDownload.suggestedFilename()).toMatch(
    //   /model-p22-2-bijlage_gr2022_test_gemeente_test-\d{8}-\d{6}.zip/,
    // );
    // expect((await stat(await attachmentDownload.path())).size).toBeGreaterThan(1024);

    // const countsDownloadPromise = page.waitForEvent("download");
    // await electionReportPage.downloadCSBCountsZip.click();
    // const countsDownload = await countsDownloadPromise;
    // expect(countsDownload.suggestedFilename()).toMatch(
    //   /definitieve-documenten_gr2022_test_gemeente_test-\d{8}-\d{6}.zip/,
    // );
    // expect((await stat(await countsDownload.path())).size).toBeGreaterThan(1024);

    // await logout(page);
  });
});
