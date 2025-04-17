import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { USER_LIST_REQUEST_PATH, UserListResponse } from "@/types/generated/openapi";

export function useUserListRequest() {
  const path: USER_LIST_REQUEST_PATH = `/api/user`;
  return useInitialApiGetWithErrors<UserListResponse>(path);
}
