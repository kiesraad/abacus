import { ApiError } from "@kiesraad/api";

export type AppError = Error | ApiError;

export interface AppState {
  error: AppError | null;
}

export interface AppStateActionSetError {
  type: "SET_ERROR";
  error: AppError | null;
}

export interface AppStateActionClearError {
  type: "CLEAR_ERROR";
}

export type AppStateAction = AppStateActionSetError | AppStateActionClearError;
