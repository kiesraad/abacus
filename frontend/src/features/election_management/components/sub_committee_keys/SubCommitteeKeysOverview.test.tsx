import { waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import alertCls from "@/components/ui/Alert/Alert.module.css";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { tx } from "@/i18n/translate";
import { CSBSubCommitteeCertificateAddRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import {
  getAddCertificateResponse,
  getCertificateMockData,
  getSubCommitteeMockData,
} from "@/testing/api-mocks/SubCommitteeMockData";
import type { Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { render, renderReturningRouter, screen, within } from "@/testing/test-utils";
import type { SubCommittee } from "@/types/generated/openapi";
import { formatDateFullWithoutWeekday } from "@/utils/dateTime";
import * as uploadFileSize from "@/utils/uploadFileSize";
import { SubCommitteeKeysOverview } from "./SubCommitteeKeysOverview";

const renderSubCommitteeKeysOverview = (subCommittees: SubCommittee[], withRouter: boolean) => {
  const component = (
    <MessagesProvider>
      <SubCommitteeKeysOverview subCommittees={subCommittees} electionId={2} onSuccess={vi.fn()} />
    </MessagesProvider>
  );
  if (withRouter) {
    return renderReturningRouter(component);
  } else {
    return render(component);
  }
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
const subCommittees = [
  getSubCommitteeMockData({ id: 1, authority_id: "0358", authority_name: "Aalsmeer" }),
  getSubCommitteeMockData({
    id: 7,
    authority_id: "1942",
    authority_name: "Gooise Meren",
    certificates: [
      getCertificateMockData(),
      getCertificateMockData(),
      getCertificateMockData(),
      getCertificateMockData(),
    ],
  }),
];

describe("SubCommitteeKeysOverview", () => {
  const pushMessage = vi.fn();
  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      hasMessages: vi.fn(),
      popMessages: vi.fn(),
      pushMessage,
    });

    server.use(CSBSubCommitteeCertificateAddRequestHandler);
  });

  test("Imported row navigates to the sub committee detail page, pending row does not", async () => {
    const user = userEvent.setup();

    const router = renderSubCommitteeKeysOverview(subCommittees, true) as Router;

    const [pendingTable, importedTable] = await screen.findAllByRole("table");

    await user.click(within(pendingTable!).getByRole("row", { name: "0358 Aalsmeer" }));
    expect(router.state.location.pathname).toEqual("/");

    await user.click(within(importedTable!).getByRole("row", { name: "1942 Gooise Meren 4" }));
    expect(router.state.location.pathname).toEqual("/7");
  });

  test("Adds success message when uploading correct certificate", async () => {
    const router = renderSubCommitteeKeysOverview(subCommittees, true) as Router;
    await uploadFile(file);

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "success",
        title: "Publieke sleutel Aalsmeer toegevoegd",
        text: undefined,
      });
      expect(router.state.location.pathname).toEqual("/");
    });
  });

  test("Adds success message when uploading correct but expired certificate", async () => {
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
    const router = renderSubCommitteeKeysOverview(subCommittees, true) as Router;
    await uploadFile(file);

    await waitFor(() => {
      expect(pushMessage).toHaveBeenCalledWith({
        type: "warning",
        title: "Publieke sleutel Aalsmeer toegevoegd",
        text: tx("sub_committee_keys.key_expired", undefined, {
          date: formatDateFullWithoutWeekday(new Date(certificate.not_after)),
          authority_name: "Aalsmeer",
        }),
      });
      expect(router.state.location.pathname).toEqual("/");
    });
  });

  test("Shows an error alert when frontend determines uploaded file is too large", async () => {
    vi.spyOn(uploadFileSize, "isFileTooLarge").mockResolvedValueOnce(true);

    renderSubCommitteeKeysOverview(subCommittees, false);
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Ongeldige publieke sleutel");
    expect(alert).toHaveTextContent(`Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`);
    expect(alert).toHaveClass(alertCls.error!);
  });

  test("Shows an error alert when backend determines uploaded file is too large", async () => {
    overrideOnce("post", "/api/elections/2/sub_committee_certificates", 413, {
      error: "15",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    renderSubCommitteeKeysOverview(subCommittees, false);
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Ongeldige publieke sleutel");
    expect(alert).toHaveTextContent(`Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`);
    expect(alert).toHaveClass(alertCls.error!);
  });

  test("Shows an error alert when backend determines uploaded file is invalid", async () => {
    overrideOnce("post", "/api/elections/2/sub_committee_certificates", 400, {
      error: "Invalid certificate",
      fatal: false,
      reference: "InvalidCertificate",
    });

    renderSubCommitteeKeysOverview(subCommittees, false);
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Geen publieke sleutel");
    expect(alert).toHaveTextContent(
      "Het bestand dat je probeert te importeren is geen publieke sleutel. Probeer een ander bestand.",
    );
    expect(alert).toHaveClass(alertCls.error!);
  });

  test("Shows an error alert when backend determines uploaded certificate is for wrong election", async () => {
    overrideOnce("post", "/api/elections/2/sub_committee_certificates", 422, {
      error: "Certificate is for another election",
      fatal: false,
      reference: "CertificateWrongElection",
    });

    renderSubCommitteeKeysOverview(subCommittees, false);
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Publieke sleutel voor andere verkiezing");
    expect(alert).toHaveTextContent("De publieke sleutel hoort bij een andere verkiezing");
    expect(alert).toHaveClass(alertCls.error!);
  });

  test("Shows an error alert when backend determines uploaded certificate is for unknown subcommittee", async () => {
    overrideOnce("post", "/api/elections/2/sub_committee_certificates", 422, {
      error: "Certificate is for an unknown sub committee",
      fatal: false,
      reference: "CertificateUnknownSubCommittee",
    });

    renderSubCommitteeKeysOverview(subCommittees, false);
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Publieke sleutel van onbekend stembureau");
    expect(alert).toHaveTextContent("De publieke sleutel hoort bij een GSB dat niet bij deze verkiezing hoort");
    expect(alert).toHaveClass(alertCls.error!);
  });

  test("Shows a success alert when backend determines uploaded certificate is already added", async () => {
    overrideOnce("post", "/api/elections/2/sub_committee_certificates", 409, {
      error: "Public key was already added",
      fatal: false,
      reference: "CertificateAlreadyAdded",
    });

    renderSubCommitteeKeysOverview(subCommittees, false);
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Publieke sleutel al geïmporteerd");
    expect(alert).toHaveTextContent("Deze publieke sleutel is al toegevoegd");
    expect(alert).toHaveClass(alertCls.success!);
  });
});
