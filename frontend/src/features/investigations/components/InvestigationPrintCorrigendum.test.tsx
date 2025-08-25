import * as ReactRouter from "react-router";

import { render } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { server } from "@/testing/server";
import { setupTestRouter } from "@/testing/test-utils";

import { AddInvestigantionLayout } from "./AddInvestigantionLayout";
import { InvestigationPrintCorrigendum } from "./InvestigationPrintCorrigendum";

const navigate = vi.fn();

async function renderPage() {
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "investigations/add/:pollingStationId",
          Component: AddInvestigantionLayout,
          children: [
            {
              path: "print-corrigendum",
              Component: InvestigationPrintCorrigendum,
            },
          ],
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/investigations/add/1/print-corrigendum");
  render(<Providers router={router} />);

  return router;
}

describe("InvestigationPrintCorrigendum", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  it("renders without crashing", async () => {
    await renderPage();
  });
});
