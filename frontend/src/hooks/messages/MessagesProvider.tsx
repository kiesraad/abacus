import { type ReactNode, useRef } from "react";

import { type Message, MessagesContext } from "@/hooks/messages/MessagesContext";

export function MessagesProvider({ children }: { children: ReactNode }) {
  const messages = useRef<Message[]>([]);

  function pushMessage(message: Message) {
    return messages.current.push(message);
  }

  function popMessages() {
    return messages.current.splice(0);
  }

  function hasMessages() {
    return messages.current.length > 0;
  }

  return (
    <MessagesContext.Provider value={{ pushMessage, popMessages, hasMessages }}>{children}</MessagesContext.Provider>
  );
}
