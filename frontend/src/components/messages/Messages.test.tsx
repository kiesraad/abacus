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

    const successAlert = alerts[0]!;
    const infoAlert = alerts[1]!;
    const warningAlert = alerts[2]!;
    const errorAlert = alerts[3]!;

    expect(within(successAlert).getByRole("strong")).toHaveTextContent("Welcome");
    expect(within(successAlert).getByRole("paragraph")).toHaveTextContent("You are back");
    expect(within(infoAlert).getByRole("strong")).toHaveTextContent("All your base are belong to us");
    expect(within(warningAlert).getByRole("strong")).toHaveTextContent("Main screen turn on");
    expect(within(warningAlert).getByRole("paragraph")).toHaveTextContent("Somebody set up us the bomb");
    expect(within(errorAlert).getByRole("strong")).toHaveTextContent("Tik tok");
    expect(within(errorAlert).getByRole("paragraph")).toHaveTextContent("The bomb goes off in 5 minutes");

    vi.advanceTimersByTime(5_000);

    await vi.waitFor(() => {
      alerts = screen.getAllByRole("alert");
      expect(alerts).toHaveLength(3);
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
