import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { StatusList } from "./StatusList";
import { DefaultStatusList } from "./StatusList.stories";

describe("StatusList", () => {
  test("renders a list", () => {
    render(
      <StatusList>
        <StatusList.Item status="accept">Hello</StatusList.Item>
        <StatusList.Item status="warning">World</StatusList.Item>
      </StatusList>,
    );
    expect(document.querySelector("ul")).not.toBeNull();
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  test("It renders all icons", () => {
    render(<DefaultStatusList />);

    expect(screen.getByRole("img", { name: "bevat een waarschuwing" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "bevat een fout" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "leeg" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "opgeslagen" })[0]).toBeInTheDocument();
  });
});
