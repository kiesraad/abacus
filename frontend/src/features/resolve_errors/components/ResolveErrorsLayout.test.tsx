import * as ReactRouter from "react-router";

import { describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetErrorsHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, waitFor, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ResolveErrorsLayout } from "./ResolveErrorsLayout";

const renderLayout = () => {
  return render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <MessagesProvider>
            <ResolveErrorsLayout />
          </MessagesProvider>
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
};

describe("ResolveErrorsLayout", () => {
  test("renders layout with polling station header and navigation", async () => {
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryGetErrorsHandler,
    );
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ electionId: "1", pollingStationId: "5" });
    vi.spyOn(ReactRouter, "Outlet").mockReturnValue(<div>Outlet Content</div>);

    renderLayout();

    const banner = await screen.findByRole("banner");

    expect(
      within(banner).getByRole("heading", { level: 1, name: "Dansschool Oeps nou deed ik het weer" }),
    ).toBeInTheDocument();
    expect(within(banner).getByText("37")).toBeInTheDocument();
    expect(within(banner).getByText("1e invoer")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Fouten en waarschuwingen" })).toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe("Fouten en waarschuwingen oplossen - Abacus");
    });
  });
});
