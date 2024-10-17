export enum ErrorAction {
  None = "none",
  Back = "back",
}

export class NotFoundError extends Error {
  path: string;

  constructor(message: string) {
    super(message);
    this.path = window.location.pathname;
  }
}
