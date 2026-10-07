import { userEvent } from "@testing-library/user-event/dist/cjs/index.js";
import { beforeEach, describe, expect, test } from "vitest";
import alertCls from "@/components/ui/Alert/Alert.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import {
  CSBElectionRequestHandler,
  CSBSubCommitteeCertificateAddRequestHandler,
  CSBSubCommitteeCertificatesRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getAddCertificateResponse, getCertificateMockData } from "@/testing/api-mocks/SubCommitteeMockData";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { SubCommitteeKeysOverviewPage } from "./SubCommitteeKeysOverviewPage";

const renderSubCommitteeKeysOverviewPage = () => {
  const component = (
    <MessagesProvider>
      <ElectionProvider electionId={2}>
        <SubCommitteeKeysOverviewPage />
      </ElectionProvider>
    </MessagesProvider>
  );
  return render(component);
};

async function uploadFile(file: File) {
  const user = userEvent.setup();
  const input = await screen.findByLabelText("Bestand kiezen");
  expect(input).toBeVisible();
  expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
  await user.upload(input, file);
}

const filename = "foo.txt";
const file = new File(["foo"], filename, { type: "text/plain" });

describe("SubCommitteeKeysOverviewPage", () => {
  beforeEach(() => {
    server.use(CSBElectionRequestHandler, CSBSubCommitteeCertificatesRequestHandler);
  });

  test("Shows the pending and imported keys of the sub committees", async () => {
    renderSubCommitteeKeysOverviewPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Sleutels van GSB's beheren" })).toBeVisible();

    const [pendingTable, importedTable] = screen.getAllByRole("table");
    expect(pendingTable).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau"],
      ["0358", "Aalsmeer"],
      ["0362", "Amstelveen"],
      ["0375", "Beverwijk"],
      ["0376", "Blaricum"],
    ]);
    expect(importedTable).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau", "Sleutels"],
      ["0377", "Bloemendaal", "1"],
      ["0384", "Diemen", "2"],
      ["1942", "Gooise Meren", "4"],
      ["0392", "Haarlem", "1"],
    ]);
  });

  test("Shows a success alert when uploading a correct certificate", async () => {
    server.use(CSBSubCommitteeCertificateAddRequestHandler);

    renderSubCommitteeKeysOverviewPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Sleutels van GSB's beheren" })).toBeVisible();

    await uploadFile(file);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Publieke sleutel Aalsmeer toegevoegd");
    // No warnings, so the alert should be a success alert
    expect(alert).toHaveClass(alertCls.success!);
  });

  test("Shows a warning alert when uploading a correct but expired certificate", async () => {
    server.use(CSBSubCommitteeCertificateAddRequestHandler);
    const certificate = getCertificateMockData({ common_name: "Gemeente Aalsmeer", not_after: "2026-01-01T00:00:00Z" });
    overrideOnce(
      "post",
      "/api/elections/2/sub_committee_certificates",
      201,
      getAddCertificateResponse({
        expired: true,
        certificate: certificate,
      }),
    );

    renderSubCommitteeKeysOverviewPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Sleutels van GSB's beheren" })).toBeVisible();

    await uploadFile(file);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Publieke sleutel Aalsmeer toegevoegd");
    expect(alert).toHaveTextContent(
      "Let op: Deze sleutel is verlopen op 1 januari 2026, maar kan wel gebruikt worden. Neem bij twijfel contact op met het GSB van Aalsmeer of de Kiesraad.",
    );
    // Expired certificate, so the alert should be a warning alert
    expect(alert).toHaveClass(alertCls.warning!);
  });
});
