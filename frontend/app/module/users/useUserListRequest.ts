import { useApiRequestWithErrors, USER_LIST_REQUEST_PATH, UserListResponse } from "@kiesraad/api";

export function useUserListRequest() {
  const path: USER_LIST_REQUEST_PATH = `/api/user`;
  return useApiRequestWithErrors<UserListResponse>(path);
}
