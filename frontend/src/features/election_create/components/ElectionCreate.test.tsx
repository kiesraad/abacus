import { RouterProvider } from "react-router";

import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

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
        <RouterProvider router={router} />
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

describe("Election create pages", () => {
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
    expect(await screen.findByText(election.name)).toBeInTheDocument();

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
