import * as ReactRouter from "react-router";

import { render } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { setupTestRouter } from "@/testing/test-utils";

import { InvestigationsOverview } from "./InvestigationsOverview";

const navigate = vi.fn();

async function renderPage() {
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "investigations",
          Component: InvestigationsOverview,
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations");
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationsOverview", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  it("renders without crashing", async () => {
    await renderPage();
  });
});
