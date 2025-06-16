import { RouterProvider } from "react-router";

import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ElectionListProvider } from "@/hooks/election/ElectionListProvider";
import { newElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionListRequestHandler, ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionDefinitionValidateResponse, NewElection } from "@/types/generated/openapi";

import { electionCreateRoutes } from "../routes";

const Providers = ({
  children,
  router = getRouter(children),
  fetchInitialUser = false,
}: {
  children?: React.ReactNode;
  router?: Router;
  fetchInitialUser?: boolean;
}) => {
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <TestUserProvider userRole="administrator">
        <ElectionListProvider>
          <RouterProvider router={router} />
        </ElectionListProvider>
      </TestUserProvider>
    </ApiProvider>
  );
};

function renderWithRouter() {
  const router = setupTestRouter([
    {
      path: "/",
      Component: null,
      children: [
        {
          path: "elections",
          children: [
            {
              path: "create",
              children: electionCreateRoutes,
            },
          ],
        },
      ],
    },
  ]);
  rtlRender(<Providers router={router} />);
  return router;
}

function electionValidateResponse(election: NewElection): ElectionDefinitionValidateResponse {
  return {
    hash: {
      // NOTE: In actual data, the redacted version of the hash
      // will have empty strings at the `redacted_indexes` positions.
      // We leave them in here so we can test their absence
      chunks: [
        "asdf",
        "qwer",
        "zxcv",
        "tyui",
        "ghjk",
        "bnml",
        "1234",
        "5678",
        "8765",
        "gfsd",
        "a345",
        "qwer",
        "lgmg",
        "thnr",
        "nytf",
        "sdfr",
      ],
      redacted_indexes: [2, 9],
    },
    election,
  };
}

describe("Election create pages", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
    server.use(ElectionRequestHandler);
  });

  test("Shows error when uploading invalid file", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });

    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezing toevoegen" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    // Expect error message, file name should be shown
    expect(screen.getByText(filename)).toBeInTheDocument();
  });

  test("Shows error when uploading too large file", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });

    overrideOnce("post", "/api/elections/import/validate", 413, {
      error: "12",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();

    await user.upload(input, file);

    const message = screen.getByText(/Kies een bestand van maximaal 12 Megabyte./i);
    expect(message).toBeVisible();
  });

  test("Shows and validates hash when uploading valid file", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezing toevoegen" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    // Wait for the page to be loaded and expect the election name to be present
    expect(await screen.findByText(newElectionMockData.name)).toBeInTheDocument();

    // Expect parts of the hash to be shown
    expect(screen.getByText("asdf")).toBeInTheDocument();
    // Expect redacted chunks to be stubs
    expect(screen.queryByText("zxcv")).not.toBeInTheDocument();

    // Expect stub to be highlighted
    expect(screen.getByText("1")).toHaveRole("mark");
    expect(screen.getByText("2")).not.toHaveRole("mark");

    // Override again
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const inputPart1 = screen.getByLabelText("Controle deel 1");
    await user.type(inputPart1, "zxcv");

    const inputPart2 = screen.getByLabelText("Controle deel 2");
    await user.click(inputPart2);
    expect(screen.getByText("1")).not.toHaveRole("mark");
    expect(screen.getByText("2")).toHaveRole("mark");

    // Click somewhere arbitrary and expect no highlights
    await user.click(screen.getByText("Controleer verkiezingsdefinitie"));
    expect(screen.getByText("1")).not.toHaveRole("mark");
    expect(screen.getByText("2")).not.toHaveRole("mark");
    await user.type(inputPart2, "gfsd");
    await user.click(screen.getByText("Volgende"));

    // Expect to see the next page
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
  });

  test("Shows error on invalid input", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    await user.upload(input, file);

    // Wait for the page to be loaded and expect the election name to be present
    expect(await screen.findByText(newElectionMockData.name)).toBeInTheDocument();
    const inputPart1 = screen.getByLabelText("Controle deel 1");
    await user.type(inputPart1, "zxcv");
    const inputPart2 = screen.getByLabelText("Controle deel 2");
    await user.type(inputPart2, "123");
    await user.click(screen.getByText("Volgende"));

    // Expect error to be shown
    expect(await screen.findByText("Controle digitale vingerafdruk niet gelukt")).toBeInTheDocument();
  });

  test("Shows an error when uploading an invalid candidate list", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create/list-of-candidates");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // Expect to see the next page
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const candidateInput = await screen.findByLabelText("Bestand kiezen");
    expect(candidateInput).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    // Give invalid XML error
    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    await user.upload(candidateInput, file);

    // Expect error message, file name should be shown
    expect(screen.getByText(filename)).toBeInTheDocument();
  });

  test("Shows error when uploading too large candidate list file", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });

    overrideOnce("post", "/api/elections/import/validate", 413, {
      error: "12",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create/list-of-candidates");
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();

    await user.upload(input, file);

    const message = screen.getByText(/Kies een bestand van maximaal 12 Megabyte./i);
    expect(message).toBeVisible();
  });

  test("Shows and validates hash when uploading valid candidate list file", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create/list-of-candidates");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    // Expect parts of the hash to be shown
    expect(screen.getByText("asdf")).toBeInTheDocument();
    // Expect redacted chunks to be stubs
    expect(screen.queryByText("zxcv")).not.toBeInTheDocument();

    // Expect stub to be highlighted
    expect(screen.getByText("1")).toHaveRole("mark");
    expect(screen.getByText("2")).not.toHaveRole("mark");

    // Override again
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const inputPart1 = screen.getByLabelText("Controle deel 1");
    await user.type(inputPart1, "zxcv");

    const inputPart2 = screen.getByLabelText("Controle deel 2");
    await user.click(inputPart2);
    expect(screen.getByText("1")).not.toHaveRole("mark");
    expect(screen.getByText("2")).toHaveRole("mark");

    // Click somewhere arbitrary and expect no highlights
    await user.click(screen.getByText("Controleer kandidatenlijst"));
    expect(screen.getByText("1")).not.toHaveRole("mark");
    expect(screen.getByText("2")).not.toHaveRole("mark");
    await user.type(inputPart2, "gfsd");
    await user.click(screen.getByText("Volgende"));

    // Expect to see the next page
    expect(await screen.findByRole("heading", { level: 2, name: "Controleren en opslaan" })).toBeVisible();
  });
});
