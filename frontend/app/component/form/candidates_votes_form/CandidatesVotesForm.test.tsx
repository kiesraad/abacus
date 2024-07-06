import { overrideOnce, render, screen } from "app/test/unit";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi, afterEach } from "vitest";
import { CandidatesVotesForm } from "./CandidatesVotesForm";
import { politicalGroupMockData } from "../../../../lib/api-mocks/ElectionMockData.ts";

describe("Test CandidatesVotesForm", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // ToDo: tests pass without this, so not needed?
  });

  test("hitting enter key does not result in api call", async () => {
    const spy = vi.spyOn(global, "fetch");

    const user = userEvent.setup();
    render(<CandidatesVotesForm group={politicalGroupMockData} />);

    const candidate1 = screen.getByTestId("list1-candidate1");
    await user.clear(candidate1);
    await user.type(candidate1, "12345");
    expect(candidate1).toHaveValue("12.345");

    await user.keyboard("{enter}");

    expect(spy).not.toHaveBeenCalled();
  });

  test("Form field entry and keybindings", async () => {
    overrideOnce(
      "post",
      "/v1/api/polling_stations/:polling_station_id/data_entries/:entry_number",
      200,
      {
        message: "Data saved",
        saved: true,
        validation_results: { errors: [], warnings: [] },
      },
    );

    const user = userEvent.setup();

    render(<CandidatesVotesForm group={politicalGroupMockData} />);

    const candidate1 = screen.getByTestId("list1-candidate1");
    expect(candidate1).toHaveFocus();
    await user.clear(candidate1);
    await user.type(candidate1, "12345");
    expect(candidate1).toHaveValue("12.345");

    await user.keyboard("{enter}");

    const candidate2 = screen.getByTestId("list1-candidate2");
    expect(candidate2).toHaveFocus();
    await user.clear(candidate2);
    await user.type(candidate2, "6789");
    expect(candidate2).toHaveValue("6.789");

    await user.keyboard("{enter}");

    const candidate3 = screen.getByTestId("list1-candidate3");
    expect(candidate3).toHaveFocus();
    await user.clear(candidate3);
    await user.type(candidate3, "123");
    expect(candidate3).toHaveValue("123");

    await user.keyboard("{enter}");

    const candidate4 = screen.getByTestId("list1-candidate4");
    expect(candidate4).toHaveFocus();
    await user.clear(candidate4);
    await user.paste("4242");
    expect(candidate4).toHaveValue("4.242");

    await user.keyboard("{enter}");

    const candidate5 = screen.getByTestId("list1-candidate5");
    expect(candidate5).toHaveFocus();
    await user.clear(candidate5);
    await user.type(candidate5, "12");
    expect(candidate5).toHaveValue("12");

    await user.keyboard("{enter}");

    const candidate6 = screen.getByTestId("list1-candidate6");
    expect(candidate6).toHaveFocus();
    await user.clear(candidate6);
    // Test if maxLength on field works
    await user.type(candidate6, "1000000000");
    expect(candidate6).toHaveValue("100.000.000");

    await user.keyboard("{enter}");

    const candidate7 = screen.getByTestId("list1-candidate7");
    expect(candidate7).toHaveFocus();
    await user.clear(candidate7);
    await user.type(candidate7, "3");
    expect(candidate7).toHaveValue("3");

    await user.keyboard("{enter}");

    const total = screen.getByTestId("list1-total");
    await user.click(total);
    expect(total).toHaveFocus();
    await user.clear(total);
    await user.type(total, "555");
    expect(total).toHaveValue("555");

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    // const result = await screen.findByTestId("result");
    //
    // expect(result).toHaveTextContent(/^Success$/);
  });

  // TODO: Add tests once submit is added
  describe("VotersAndVotesForm Api call", () => {
    test.skip("VotersAndVotesForm request body is equal to the form data", async () => {
      const spy = vi.spyOn(global, "fetch");

      const expectedRequest = {};

      const user = userEvent.setup();

      render(<CandidatesVotesForm group={politicalGroupMockData} />);

      const submitButton = screen.getByRole("button", { name: "Volgende" });
      await user.click(submitButton);

      expect(spy).toHaveBeenCalledWith("http://testhost/v1/api/polling_stations/1/data_entries/1", {
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
    overrideOnce(
      "post",
      "/v1/api/polling_stations/:polling_station_id/data_entries/:entry_number",
      422,
      {
        message: "422 error from mock",
      },
    );

    const user = userEvent.setup();

    render(<CandidatesVotesForm group={politicalGroupMockData} />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Error 422 error from mock$/);
  });

  test.skip("500 response results in display of error message", async () => {
    overrideOnce(
      "post",
      "/v1/api/polling_stations/:polling_station_id/data_entries/:entry_number",
      500,
      {
        message: "500 error from mock",
        errorCode: "500_ERROR",
      },
    );

    const user = userEvent.setup();

    render(<CandidatesVotesForm group={politicalGroupMockData} />);

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);
    const result = await screen.findByTestId("result");
    expect(result).toHaveTextContent(/^Error 500_ERROR 500 error from mock$/);
  });
});
