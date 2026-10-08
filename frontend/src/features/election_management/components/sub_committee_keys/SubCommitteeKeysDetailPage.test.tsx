import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import * as ReactRouter from "react-router";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";
import alertCls from "@/components/ui/Alert/Alert.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import {
  CSBElectionRequestHandler,
  CSBSubCommitteeCertificatesRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getCertificateMockData, getSubCommitteeMockData } from "@/testing/api-mocks/SubCommitteeMockData";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import type { SubCommittee } from "@/types/generated/openapi";
import { SubCommitteeKeysDetailPage } from "./SubCommitteeKeysDetailPage";

const navigate = vi.fn();

const renderSubCommitteeKeyDetailPage = () => {
  const component = (
    <MessagesProvider>
      <ElectionProvider electionId={2}>
        <SubCommitteeKeysDetailPage />
      </ElectionProvider>
    </MessagesProvider>
  );
  return render(component);
};

describe("SubCommitteeKeysDetailPage", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ subCommitteeId: "8" });
    server.use(CSBElectionRequestHandler);
  });

  test("Shows the both imported keys of the sub committees", async () => {
    server.use(CSBSubCommitteeCertificatesRequestHandler);
    renderSubCommitteeKeyDetailPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Sleutels van GSB's beheren" })).toBeVisible();

    const certificates = await screen.findAllByTestId(/certificate-\w/);
    expect(certificates.length).toBe(2);
    expect(certificates[0]).toHaveTextContent(
      [
        "Organisatie: PS2027_Noord-Holland",
        "Organisatorische eenheid: Abacus 1.2.0",
        "Algemene naam: Gemeente Diemen",
        "Geldig vanaf: 1 januari 2026",
        "Geldig tot en met: 1 april 2027",
        "Handtekeningalgoritme: RSA 4096-bit",
      ].join(""),
    );
    expect(certificates[0]).toHaveTextContent("Publieke sleutel GSB Diemen PS2027_Noord-Holland");
    expect(within(certificates[0]!).getByRole("button", { name: "Verwijderen" })).toBeVisible();
    expect(certificates[1]).toHaveTextContent(
      [
        "Organisatie: PS2027_Noord-Holland",
        "Organisatorische eenheid: Abacus 1.2.0",
        "Algemene naam: Gemeente Diemen",
        "Geldig vanaf: 1 januari 2026",
        "Geldig tot en met: 1 april 2027",
        "Handtekeningalgoritme: RSA 4096-bit",
      ].join(""),
    );
    expect(certificates[1]).toHaveTextContent("Publieke sleutel GSB Diemen PS2027_Noord-Holland");
    expect(within(certificates[1]!).getByRole("button", { name: "Verwijderen" })).toBeVisible();
  });

  test("Shows a success alert when deleting a non-last certificate", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/elections/2/sub_committee_certificates", () =>
        HttpResponse.json(
          [
            getSubCommitteeMockData({
              id: 8,
              number: 8,
              name: "Diemen",
              authority_id: "0384",
              authority_name: "Diemen",
              certificates: [
                getCertificateMockData({ common_name: "Gemeente Diemen", public_key_fingerprint: "abc" }),
                getCertificateMockData({ common_name: "Gemeente Diemen", public_key_fingerprint: "def" }),
              ],
            }),
          ] satisfies SubCommittee[],
          { status: 200 },
        ),
      ),
    );
    server.use(
      http.delete("/api/elections/2/sub_committees/8/certificates/abc", () => new HttpResponse(null, { status: 204 })),
    );

    renderSubCommitteeKeyDetailPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Sleutels van GSB's beheren" })).toBeVisible();

    const certificates = await screen.findAllByTestId(/certificate-\w/);
    expect(certificates.length).toBe(2);
    const firstCertificateDeleteButton = within(certificates[0]!).getByRole("button", { name: "Verwijderen" });
    expect(firstCertificateDeleteButton).toBeVisible();

    await user.click(firstCertificateDeleteButton);

    const deleteModal = await screen.findByRole("dialog");
    expect(within(deleteModal).getByRole("heading", { level: 3, name: "Publieke sleutel verwijderen?" })).toBeVisible();
    expect(within(deleteModal).getByRole("paragraph")).toHaveTextContent(
      "Weet je zeker dat je deze sleutel wilt verwijderen? Deze actie kan niet worden teruggedraaid.",
    );
    expect(within(deleteModal).getByRole("button", { name: "Annuleren" })).toBeVisible();
    const deleteButton = within(deleteModal).getByRole("button", { name: "Verwijder sleutel" });
    expect(deleteButton).toBeVisible();

    server.use(
      http.get("/api/elections/2/sub_committee_certificates", () =>
        HttpResponse.json(
          [
            getSubCommitteeMockData({
              id: 8,
              number: 8,
              name: "Diemen",
              authority_id: "0384",
              authority_name: "Diemen",
              certificates: [getCertificateMockData({ common_name: "Gemeente Diemen", public_key_fingerprint: "def" })],
            }),
          ] satisfies SubCommittee[],
          { status: 200 },
        ),
      ),
    );

    await user.click(deleteButton);

    expect(navigate).not.toHaveBeenCalled();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Publieke sleutel Diemen verwijderd");
    expect(alert).toHaveTextContent("De sleutel is verwijderd. Onderstaande sleutels zijn nog aanwezig.");
    expect(alert).toHaveClass(alertCls.success!);
  });

  test("Redirects to overview page when deleting a last certificate", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/elections/2/sub_committee_certificates", () =>
        HttpResponse.json(
          [
            getSubCommitteeMockData({
              id: 8,
              number: 8,
              name: "Diemen",
              authority_id: "0384",
              authority_name: "Diemen",
              certificates: [
                getCertificateMockData({
                  common_name: "Gemeente Diemen",
                  public_key_fingerprint: "abc",
                }),
              ],
            }),
          ] satisfies SubCommittee[],
          { status: 200 },
        ),
      ),
    );
    server.use(
      http.delete("/api/elections/2/sub_committees/8/certificates/abc", () => new HttpResponse(null, { status: 204 })),
    );

    renderSubCommitteeKeyDetailPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Sleutels van GSB's beheren" })).toBeVisible();

    const certificates = await screen.findAllByTestId(/certificate-\w/);
    expect(certificates.length).toBe(1);
    const firstCertificateDeleteButton = within(certificates[0]!).getByRole("button", { name: "Verwijderen" });
    expect(firstCertificateDeleteButton).toBeVisible();

    await user.click(firstCertificateDeleteButton);

    const deleteModal = await screen.findByRole("dialog");
    expect(
      within(deleteModal).getByRole("heading", {
        level: 3,
        name: "Publieke sleutel verwijderen?",
      }),
    ).toBeVisible();
    expect(within(deleteModal).getByRole("paragraph")).toHaveTextContent(
      "Weet je zeker dat je deze sleutel wilt verwijderen? Deze actie kan niet worden teruggedraaid.",
    );
    expect(within(deleteModal).getByRole("button", { name: "Annuleren" })).toBeVisible();
    const deleteButton = within(deleteModal).getByRole("button", { name: "Verwijder sleutel" });
    expect(deleteButton).toBeVisible();

    server.use(
      http.get("/api/elections/2/sub_committee_certificates", () =>
        HttpResponse.json(
          [
            getSubCommitteeMockData({
              id: 8,
              number: 8,
              name: "Diemen",
              authority_id: "0384",
              authority_name: "Diemen",
              certificates: [],
            }),
          ] satisfies SubCommittee[],
          { status: 200 },
        ),
      ),
    );

    await user.click(deleteButton);

    expect(navigate).toHaveBeenCalledWith("/elections/2/sub-committees");
  });
});
