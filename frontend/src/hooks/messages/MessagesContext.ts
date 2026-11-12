import { createContext, type ReactElement } from "react";

import type { AlertType } from "@/types/ui";

export interface Message {
  type?: AlertType;
  title?: string;
  text?: string | ReactElement;
}

export interface iMessageContext {
  pushMessage: (message: Message) => void;
  popMessages: () => Message[];
  hasMessages: () => boolean;
}

export const MessagesContext = createContext<iMessageContext | undefined>(undefined);
