import { beforeEach, describe, expect, test } from "vitest";
import { ElectionCertificatePage } from "@/features/election_management/components/ElectionCertificatePage";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionCertificateDetailsRequestHandler, ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

async function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <ElectionCertificatePage />
    </ElectionProvider>,
  );

  return expect(await screen.findByRole("heading", { level: 1, name: "Publieke sleutel" })).toBeVisible();
}

describe("ElectionCertificatePage", () => {
  beforeEach(() => {
    server.use(ElectionCertificateDetailsRequestHandler, ElectionRequestHandler);
  });

  test("renders certificate information", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { level: 2, name: "Publieke sleutel Abacus-instantie GSB Heemdamseburg" }));

    const downloadLink = await screen.findByRole("link", {
      name: ["Publieke sleutel GSB Heemdamseburg AB2027_Aardenboezem", "Download crt-bestand"].join(""),
    });

    expect(downloadLink).toHaveAccessibleDescription(
      [
        "Organisatie: AB2027_Aardenboezem",
        "Organisatorische eenheid: Abacus 1.2.0",
        "Algemene naam: Gemeente Juinen",
        "Geldig vanaf: 1 januari 2026",
        "Geldig tot en met: 1 april 2026",
        "Handtekeningalgoritme: SHA256withRSA",
      ].join(""),
    );

    expect(downloadLink).toHaveAttribute("href", "/api/elections/1/certificate");
  });
});
