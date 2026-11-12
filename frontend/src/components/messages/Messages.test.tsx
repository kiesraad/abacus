import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";
import type { Message } from "@/hooks/messages/MessagesContext";
import * as useMessages from "@/hooks/messages/useMessages";

import { Messages } from "./Messages";

describe("Messages component", () => {
  const popMessages: Mock<() => Message[]> = vi.fn(() => []);
  const hasMessages: Mock<() => boolean> = vi.fn(() => false);

  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage: vi.fn(), popMessages, hasMessages });
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

  test("should auto close only success message", async () => {
    vi.useFakeTimers();
    popMessages.mockReturnValue([
      { title: "Welcome", text: "You are back" },
      { type: "notify", title: "All your base are belong to us" },
      {
        type: "warning",
        title: "Main screen turn on",
        text: "Somebody set up us the bomb",
      },
      {
        type: "error",
        title: "Tik tok",
        text: "The bomb goes off in 5 minutes",
      },
    ]);
    render(<Messages autoCloseTimeout={5_000} />);

    let alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(4);
    expect(within(alerts[0]!).getByRole("strong")).toHaveTextContent("Welcome");
    expect(within(alerts[0]!).getByRole("paragraph")).toHaveTextContent("You are back");
    expect(within(alerts[1]!).getByRole("strong")).toHaveTextContent("All your base are belong to us");
    expect(within(alerts[2]!).getByRole("strong")).toHaveTextContent("Main screen turn on");
    expect(within(alerts[2]!).getByRole("paragraph")).toHaveTextContent("Somebody set up us the bomb");
    expect(within(alerts[3]!).getByRole("strong")).toHaveTextContent("Tik tok");
    expect(within(alerts[3]!).getByRole("paragraph")).toHaveTextContent("The bomb goes off in 5 minutes");

    vi.advanceTimersByTime(5_000);

    await vi.waitFor(() => {
      alerts = screen.getAllByRole("alert");
      expect(alerts).toHaveLength(3);
      // The success alert is now closed
      expect(within(alerts[0]!).getByRole("strong")).toHaveTextContent("All your base are belong to us");
      expect(within(alerts[1]!).getByRole("strong")).toHaveTextContent("Main screen turn on");
      expect(within(alerts[1]!).getByRole("paragraph")).toHaveTextContent("Somebody set up us the bomb");
      expect(within(alerts[2]!).getByRole("strong")).toHaveTextContent("Tik tok");
      expect(within(alerts[2]!).getByRole("paragraph")).toHaveTextContent("The bomb goes off in 5 minutes");
    });

    vi.useRealTimers();
  });

  test("should get the messages only once", () => {
    expect(popMessages).not.toHaveBeenCalled();

    const { rerender } = render(<Messages />);
    expect(popMessages).toHaveBeenCalledTimes(1);

    rerender(<Messages />);
    expect(popMessages).toHaveBeenCalledTimes(1);
  });
});
