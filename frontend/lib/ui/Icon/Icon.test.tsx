import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import { DefaultIcon } from "./Icon.stories";

describe("UI component: Icon", () => {
  test("Icon is rendered", () => {
    const { getByRole } = render(<DefaultIcon size="md" color="warning" />);

    expect(getByRole("img")).toBeInTheDocument();
  });
});
