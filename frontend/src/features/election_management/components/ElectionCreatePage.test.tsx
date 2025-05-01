import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ElectionCreatePage } from "./ElectionCreatePage";

describe("ElectionCreatePage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test("Shows error when uploading invalid file", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });

    overrideOnce("post", "/api/elections/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });
    render(
      <TestUserProvider userRole="administrator">
        <ElectionProvider electionId={1}>
          <ElectionCreatePage />
        </ElectionProvider>
      </TestUserProvider>,
    );

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

  test("Shows hash when uploading valid file", async () => {
    const election = getElectionMockData().election;
    overrideOnce("post", "/api/elections/validate", 200, {
      hash: {
        chunks: [
          ["asdf"],
          ["qwer"],
          ["zxcv"],
          ["tyui"],
          ["ghjk"],
          ["bnml"],
          ["1234"],
          ["5678"],
          ["8765"],
          ["gfsd"],
          ["a345"],
          ["qwer"],
          ["lgmg"],
          ["thnr"],
          ["nytf"],
          ["sdfr"],
        ],
        redacted_indexes: [2, 9],
      },
      election,
    });

    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });
    render(
      <TestUserProvider userRole="administrator">
        <ElectionProvider electionId={1}>
          <ElectionCreatePage />
        </ElectionProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezing toevoegen" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    expect(screen.getByText(filename)).toBeInTheDocument();
    expect(screen.getByText(election.name)).toBeInTheDocument();
    // Expect parts of the hash to be shown
    expect(screen.getByText("asdf")).toBeInTheDocument();
    // Expect redacted chunks to be stubs
    expect(screen.queryByText("zxcv")).not.toBeInTheDocument();

    // Expect stub to be highlighted
    expect(screen.getByText("1")).toHaveRole("mark");
    expect(screen.getByText("2")).not.toHaveRole("mark");

    const inputPart2 = screen.getByLabelText("Controle deel 2");
    await user.click(inputPart2);
    expect(screen.getByText("1")).not.toHaveRole("mark");
    expect(screen.getByText("2")).toHaveRole("mark");

    // Click somewhere arbitrary and expect no highlights
    await user.click(screen.getByText("Controleer verkiezingsdefinitie"));
    expect(screen.getByText("1")).not.toHaveRole("mark");
    expect(screen.getByText("2")).not.toHaveRole("mark");
  });
});
