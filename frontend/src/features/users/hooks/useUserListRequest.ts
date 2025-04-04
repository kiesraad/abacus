import { useInitialApiGetWithErrors, USER_LIST_REQUEST_PATH, UserListResponse } from "@/api";

export function useUserListRequest() {
  const path: USER_LIST_REQUEST_PATH = `/api/user`;
  return useInitialApiGetWithErrors<UserListResponse>(path);
}
