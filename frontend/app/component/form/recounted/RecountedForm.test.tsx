import { overrideOnce, render, screen } from "app/test/unit";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { RecountedForm } from "./RecountedForm";

describe("Test RecountedForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();
    render(<RecountedForm />);

    const yes = screen.getByTestId("yes");
    await user.click(yes);
    expect(yes).toBeChecked();

    await user.keyboard("{enter}");

    expect(spy).not.toHaveBeenCalled();
  });

  test("Form field entry and keybindings", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 200, {
      message: "Data saved",
      saved: true,
      validation_results: { errors: [], warnings: [] },
    });

    const user = userEvent.setup();

    render(<RecountedForm />);

    const yes = screen.getByTestId("yes");
    const no = screen.getByTestId("no");
    const submitButton = screen.getByRole("button", { name: "Volgende" });

    expect(yes).not.toBeChecked();
    expect(no).not.toBeChecked();

    await user.click(submitButton);

    const validationError = screen.getByText("Controleer het papieren proces-verbaal");
    expect(validationError).toBeVisible();

    await user.click(yes);
    expect(yes).toBeChecked();
    expect(no).not.toBeChecked();
    await user.click(no);
    expect(no).toBeChecked();
    expect(yes).not.toBeChecked();

    await user.click(submitButton);

    // const result = await screen.findByTestId("result");
    //
    // expect(result).toHaveTextContent(/^Success$/);
  });

  // TODO: Add tests once submit is added
  describe("RecountedForm Api call", () => {
    test.skip("RecountedForm request body is equal to the form data", async () => {
      const spy = vi.spyOn(global, "fetch");

      const expectedRequest = {};

      const user = userEvent.setup();

      render(<RecountedForm />);

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalledWith("http://testhost/api/polling_stations/1/data_entries/1", {
        method: "POST",
        body: JSON.stringify(expectedRequest),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await screen.findByTestId("result");
      expect(result).toHaveTextContent(/^Success$/);
    });
  });

  test.skip("422 response results in display of error message", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 422, {
      message: "422 error from mock",
    });

    const user = userEvent.setup();

    render(<RecountedForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Error 422 error from mock$/);
  });

  test.skip("500 response results in display of error message", async () => {
    overrideOnce("post", "/api/polling_stations/1/data_entries/1", 500, {
      message: "500 error from mock",
      errorCode: "500_ERROR",
    });

    const user = userEvent.setup();

    render(<RecountedForm />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Error 500_ERROR 500 error from mock$/);
  });
});
