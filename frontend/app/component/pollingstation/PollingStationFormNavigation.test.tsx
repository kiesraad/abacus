import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { describe, test } from "vitest";

import { overrideOnce, render } from "app/test/unit";

import { ApiProvider, PollingStationFormController } from "@kiesraad/api";
import { electionMock } from "@kiesraad/api-mocks";

import { PollingStationFormNavigation } from "./PollingStationFormNavigation";

//TODO: where should this logic live?

// vi.mock("../../../../lib/api/form/pollingstation/usePollingStationFormController", () => {
//   return {
//     formState: { bla }
//   }
// })

const Children = () => (
  <PollingStationFormController election={electionMock} pollingStationId={1} entryNumber={1}>
    <PollingStationFormNavigation />
  </PollingStationFormController>
);

const router = createMemoryRouter([{ path: "*", element: <Children /> }]);

const Component = (
  <ApiProvider host="http://testhost">
    <RouterProvider router={router} />
  </ApiProvider>
);

describe("PollingSTationFormNavigation", () => {
  test("It Renders", () => {
    render(Component);
  });

  test("422 response results in display of error message", () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, {
      message: "422 error from mock",
    });

    render(Component);

    //    const feedbackServerError = await screen.findByTestId("feedback-server-error");
    // expect(feedbackServerError).toHaveTextContent(/^Error422 error from mock$/);

    // expect(screen.queryByTestId("result")).not.toBeNull();
    // expect(screen.queryByTestId("result")).toHaveTextContent(/^422 error from mock$/);
  });

  // test("500 response results in display of error message", async () => {
  //   overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, {
  //     message: "500 error from mock",
  //     errorCode: "500_ERROR",
  //   });

  //   const user = userEvent.setup();

  //   render(Component);

  //   const submitButton = screen.getByRole("button", { name: "Volgende" });
  //   await user.click(submitButton);
  //   //const feedbackServerError = await screen.findByTestId("feedback-server-error");
  //   //expect(feedbackServerError).toHaveTextContent(/^Error500 error from mock$/);

  //   //TODO: server errors moved out of the form
  //   // expect(screen.queryByTestId("result")).not.toBeNull();
  //   // expect(screen.queryByTestId("result")).toHaveTextContent(/^500 error from mock$/);
  // });
});
