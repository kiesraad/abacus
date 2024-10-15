export interface ApiUnreachable {
  message: string;
  trace: string;
}

export interface ApiError {
  message: string;
  trace: string;
}

export type AppError = ApiUnreachable | ApiError;

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
