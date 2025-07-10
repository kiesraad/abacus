import { createContext } from "react";

import { AlertType } from "@/types/ui";

export interface Message {
  type?: AlertType;
  title?: string;
  text?: string;
}

export interface iMessageContext {
  pushMessage: (message: Message) => void;
  popMessages: () => Message[];
}

export const MessagesContext = createContext<iMessageContext | undefined>(undefined);
