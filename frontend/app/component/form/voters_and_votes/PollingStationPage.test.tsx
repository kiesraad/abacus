import { render, screen } from "@testing-library/react";
import userEvent from '@testing-library/user-event';
import { expect, test } from "vitest";

import {VotersAndVotesForm} from "./VotersAndVotesForm";


test("Test one", async () => {
  const user = userEvent.setup();

  render(<VotersAndVotesForm />);

  const pollCards = screen.getByTestId("pollCards")
  expect(pollCards).toBeVisible();

  await user.clear(pollCards)
  await user.type(pollCards, "12345")
  expect(pollCards).toHaveValue("12.345");

  // ToDo: assert the call to the mocked API once that's been implemented
});
