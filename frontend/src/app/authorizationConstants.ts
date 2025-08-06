// public routes
export const ALLOW_UNAUTHORIZED = [
  "/account/login",
  "/account/logout",
  "/account/setup",
  "/account/initialise",
  "/dev",
];

// show dialog if the session is about to expire within x seconds
export const EXPIRATION_DIALOG_SECONDS = 60 * 10; // 10 minutes
