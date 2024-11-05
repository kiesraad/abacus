import { createContext } from "react";

import { ApiClient } from "./ApiClient";

export const ApiProviderContext = createContext<ApiClient | null>(null);
