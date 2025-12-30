import { render, screen } from "@testing-library/react";
import { describe, expect, type Mock, test, vi } from "vitest";

import { useMessages } from "@/hooks/messages/useMessages";

import { MessagesProvider } from "./MessagesProvider";

function TestComponent({ onPopMessages }: { onPopMessages: Mock }) {
  const { pushMessage, popMessages } = useMessages();

  function handlePush() {
    pushMessage({ text: "Test message" });
  }

  function handlePop() {
    onPopMessages(popMessages());
  }

  return (
    <>
      <button type="button" onClick={handlePush}>
        Push message
      </button>
      <button type="button" onClick={handlePop}>
        Pop messages
      </button>
    </>
  );
}

describe("messages", () => {
  test("should push and pop a message", () => {
    const handlePopMessages = vi.fn();

    render(
      <MessagesProvider>
        <TestComponent onPopMessages={handlePopMessages} />
      </MessagesProvider>,
    );

    const pushMessage = screen.getByText("Push message");
    const popMessages = screen.getByText("Pop messages");
    expect(handlePopMessages).not.toHaveBeenCalled();

    // Push message and retrieve with pop messages
    pushMessage.click();
    popMessages.click();
    expect(handlePopMessages).toHaveBeenCalledWith([{ text: "Test message" }]);

    // Reset mock
    handlePopMessages.mockReset();
    expect(handlePopMessages).not.toHaveBeenCalled();

    // Messages should be gone after previous pop
    popMessages.click();
    expect(handlePopMessages).toHaveBeenCalledWith([]);
  });
});
