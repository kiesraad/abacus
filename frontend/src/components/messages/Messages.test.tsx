import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { Message } from "@/hooks/messages/MessagesContext";

import { Messages } from "./Messages";

describe("Messages component", () => {
  const popMessages: Mock<() => Message[]> = vi.fn(() => []);

  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage: vi.fn(), popMessages });
  });

  test("should render message", async () => {
    popMessages.mockReturnValue([
      {
        type: "warning",
        title: "Main screen turn on",
        text: "Somebody set up us the bomb",
      },
    ]);
    render(<Messages />);

    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(1);

    const aside = within(alerts[0]!).getByRole("complementary");
    expect(within(aside).getByRole("img")).toHaveAccessibleName("Let op");

    expect(within(alerts[0]!).getByRole("strong")).toHaveTextContent("Main screen turn on");
    expect(within(alerts[0]!).getByRole("paragraph")).toHaveTextContent("Somebody set up us the bomb");
  });

  test("should render multiple messages", async () => {
    popMessages.mockReturnValue([
      { title: "All your base are belong to us" },
      { title: "You have no chance to survive make your time" },
      { title: "Move 'ZIG'" },
      { title: "For great justice" },
    ]);

    render(<Messages />);

    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(4);
  });

  test("should get the messages only once", () => {
    expect(popMessages).not.toHaveBeenCalled();

    const { rerender } = render(<Messages />);
    expect(popMessages).toHaveBeenCalledTimes(1);

    rerender(<Messages />);
    expect(popMessages).toHaveBeenCalledTimes(1);
  });
});
