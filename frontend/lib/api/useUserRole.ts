import { useUser } from "./useUser";

export function useUserRole() {
  const user = useUser();

  return {
    isTypist: user?.role === "typist",
    isAdministrator: user?.role === "administrator",
    isCoordinator: user?.role === "coordinator",
  };
}
