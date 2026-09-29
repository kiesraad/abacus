import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionCertificatePage } from "@/features/election_management/components/ElectionCertificatePage";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { tx } from "@/i18n/translate";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  DismissPublicKeyUploadReminderRequestHandler,
  ElectionCertificateDetailsRequestHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler, waitFor } from "@/testing/test-utils";
import type { ElectionDetailsResponse } from "@/types/generated/openapi";

async function renderPage() {
  render(
    <MessagesProvider>
      <ElectionProvider electionId={1}>
        <ElectionCertificatePage />
      </ElectionProvider>
    </MessagesProvider>,
  );

  return expect(await screen.findByRole("heading", { level: 1, name: "Publieke sleutel" })).toBeVisible();
}

describe("ElectionCertificatePage", () => {
  beforeEach(() => {
    server.use(
      ElectionCertificateDetailsRequestHandler,
      ElectionRequestHandler,
      DismissPublicKeyUploadReminderRequestHandler,
    );
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

  test("renders keypair reminder when showKeypairReminder is defined", async () => {
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData(),
      show_keypair_reminder: "Dismissable",
    } satisfies ElectionDetailsResponse);

    await renderPage();
    expect(
      screen.getByRole("heading", { level: 2, name: "Registreer Abacus-instantie GSB Heemdamseburg bij de Kiesraad" }),
    );

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Upload het crt-bestand naar het overdrachtsplatform",
      }),
    ).toBeVisible();
    expect(screen.getByText("Doe dit uiterlijk twee dagen voor de dag van stemming.")).toBeVisible();
  });

  test("does not render keypair reminder when showKeypairReminder is not set", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData());

    await renderPage();
    expect(screen.getByRole("heading", { level: 2, name: "Publieke sleutel Abacus-instantie GSB Heemdamseburg" }));

    expect(
      screen.queryByRole("heading", {
        level: 3,
        name: "Upload het crt-bestand naar het overdrachtsplatform",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Doe dit uiterlijk twee dagen voor de dag van stemming.")).not.toBeInTheDocument();
  });

  test("dismiss button is disabled when the certificate is not yet retrieved", async () => {
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData(),
      show_keypair_reminder: "NonDismissable",
    } satisfies ElectionDetailsResponse);
    overrideOnce("get", "/api/elections/1/certificate_details", 200, null, "infinite");

    await renderPage();

    expect(screen.getByRole("button", { name: "Ik heb dit gedaan" })).toBeDisabled();
  });

  test("dismiss button is enabled once the certificate is retrieved", async () => {
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData(),
      show_keypair_reminder: "Dismissable",
    } satisfies ElectionDetailsResponse);

    await renderPage();

    const button = screen.getByRole("button", { name: "Ik heb dit gedaan" });
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
  });

  test("dismiss button is disabled when the dismiss request is in progress", async () => {
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData(),
      show_keypair_reminder: "Dismissable",
    } satisfies ElectionDetailsResponse);
    overrideOnce("put", "/api/elections/1/dismiss_public_key_upload_reminder", 204, null, "infinite");
    const user = userEvent.setup();

    await renderPage();

    const button = screen.getByRole("button", { name: "Ik heb dit gedaan" });
    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    await user.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  test("confirming the upload updates the reminder, sets a message and navigates to election home page", async () => {
    const navigate = vi.fn();
    const pushMessage = vi.fn();
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage,
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
    const dismissReminder = spyOnHandler(DismissPublicKeyUploadReminderRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, {
      ...getElectionMockData(),
      show_keypair_reminder: "Dismissable",
    } satisfies ElectionDetailsResponse);
    const user = userEvent.setup();

    await renderPage();

    await user.click(screen.getByRole("button", { name: "Ik heb dit gedaan" }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/elections/1");
    });
    expect(dismissReminder).toHaveBeenCalledOnce();
    expect(pushMessage).toHaveBeenCalledWith({
      title: "Publieke sleutel geregistreerd",
      text: tx("election_certificate.upload.message.text"),
    });
  });
});
