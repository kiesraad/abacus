import { useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import { Message } from "@/hooks/messages/MessagesContext";
import { useMessages } from "@/hooks/messages/useMessages";

export function Messages() {
  const { popMessages } = useMessages();
  const messagesRetrieved = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Check if we already retrieved the messages, to make this work during development with react strict mode
    if (!messagesRetrieved.current) {
      setMessages(popMessages());
      messagesRetrieved.current = true;
    }
  }, [messages, popMessages]);

  function closeHandler(index: number) {
    return () => {
      setMessages((messages) => messages.filter((_, i) => i !== index));
    };
  }

  return messages.map((message, index) => (
    <Alert key={index} type={message.type ?? "success"} onClose={closeHandler(index)}>
      {message.title && <h2>{message.title}</h2>}
      {message.text && <p>{message.text}</p>}
    </Alert>
  ));
}
