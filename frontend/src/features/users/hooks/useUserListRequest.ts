import { USER_LIST_REQUEST_PATH, UserListResponse } from "@/api/gen/openapi";
import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";

export function useUserListRequest() {
  const path: USER_LIST_REQUEST_PATH = `/api/user`;
  return useInitialApiGetWithErrors<UserListResponse>(path);
}
