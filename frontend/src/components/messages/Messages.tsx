import { startTransition, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import type { Message } from "@/hooks/messages/MessagesContext";
import { useMessages } from "@/hooks/messages/useMessages";

export function Messages() {
  const { popMessages } = useMessages();
  const messagesRetrieved = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Check if we already retrieved the messages, to make this work during development with react strict mode
    if (messagesRetrieved.current) {
      return;
    }

    messagesRetrieved.current = true;

    startTransition(() => {
      setMessages(popMessages());
    });
  }, [messages, popMessages]);

  function closeHandler(index: number) {
    return () => {
      setMessages((messages) => messages.filter((_, i) => i !== index));
    };
  }

  return messages.map((message, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
    <Alert key={index} type={message.type ?? "success"} onClose={closeHandler(index)}>
      {message.title && <strong className="heading-md">{message.title}</strong>}
      {message.text && <p>{message.text}</p>}
    </Alert>
  ));
}
