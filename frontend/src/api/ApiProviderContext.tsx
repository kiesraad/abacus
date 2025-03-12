import { createContext } from "react";

import { ApiState } from "./api.types";

export const ApiProviderContext = createContext<ApiState | null>(null);
