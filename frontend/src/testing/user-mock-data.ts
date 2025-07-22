import { LoginResponse } from "@/types/generated/openapi";

export function getTypistUser(): LoginResponse {
  return {
    needs_password_change: false,
    role: "typist",
    user_id: 1,
    username: "testuser",
  };
}

export function getCoordinatorUser(): LoginResponse {
  return {
    needs_password_change: false,
    role: "coordinator",
    user_id: 2,
    username: "testcoordinator",
  };
}

export function getAdminUser(): LoginResponse {
  return {
    needs_password_change: false,
    role: "administrator",
    user_id: 3,
    username: "testadministrator",
  };
}
