import { Fragment, startTransition, useEffect, useRef, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import type { Message } from "@/hooks/messages/MessagesContext";
import { useMessages } from "@/hooks/messages/useMessages";

type MessagesProps = {
  autoCloseTimeout?: number;
};

export function Messages({ autoCloseTimeout }: MessagesProps) {
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
  }, [popMessages]);

  function closeHandler(index: number) {
    return () => {
      setMessages((messages) => messages.filter((_, i) => i !== index));
    };
  }

  return messages.map((message, index) => {
    const alertType = message.type ?? "success";
    return (
      <Alert
        // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
        key={index}
        type={alertType}
        onClose={closeHandler(index)}
        autoCloseTimeout={alertType === "success" ? autoCloseTimeout : undefined} // close success alerts after autoCloseTimeout ms if parameter set
      >
        {message.title && <strong className="heading-md">{message.title}</strong>}
        {message.text && (
          <p>
            {typeof message.text === "string"
              ? message.text.split("\n").map((line, lineIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since there is no unique id
                  <Fragment key={lineIndex}>
                    {line}
                    <br />
                  </Fragment>
                ))
              : message.text}
          </p>
        )}
      </Alert>
    );
  });
}
