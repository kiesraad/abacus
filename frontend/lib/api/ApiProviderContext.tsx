import { createContext } from "react";

import { ApiClient } from "./ApiClient";

export interface iApiProviderContext {
  client: ApiClient;
}

export const ApiProviderContext = createContext<iApiProviderContext | null>(null);
