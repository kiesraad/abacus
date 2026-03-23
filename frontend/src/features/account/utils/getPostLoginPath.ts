import type { LoginResponse } from "@/types/generated/openapi";

export function getPostLoginPath(user: LoginResponse) {
  if (!user.fullname || user.needs_password_change) {
    return "/account/setup";
  }

  return "/elections";
}
