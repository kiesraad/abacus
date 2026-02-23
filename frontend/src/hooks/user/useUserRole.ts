import { isAdministrator, isCoordinator, isTypist } from "@/utils/role";
import { useUser } from "./useUser";

export function useUserRole() {
  const user = useUser();

  if (user === null) {
    return { role: undefined, isAdministrator: false, isCoordinator: false, isTypist: false };
  }

  return {
    role: user.role,
    isAdministrator: isAdministrator(user.role),
    isCoordinator: isCoordinator(user.role),
    isTypist: isTypist(user.role),
  };
}
