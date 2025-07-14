import { useContext } from "react";

import { MessagesContext } from "./MessagesContext";

export function useMessages() {
  const context = useContext(MessagesContext);

  if (!context) {
    throw new Error("useMessages must be used within an MessagesProvider");
  }

  return context;
}
