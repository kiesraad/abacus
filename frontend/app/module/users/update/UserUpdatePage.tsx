import { useNavigate } from "react-router";

import { UpdateUserRequest, useApiRequest, User, USER_GET_REQUEST_PATH } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, FormLayout, Loader, PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

import { UserUpdateForm } from "./UserUpdateForm";
import { useUserUpdate } from "./useUserUpdate";

export function UserUpdatePage() {
  const navigate = useNavigate();
  const userId = useNumericParam("userId");
  const { requestState: getUser } = useApiRequest<User>(`/api/user/${userId}` satisfies USER_GET_REQUEST_PATH);
  const { error, update, saving } = useUserUpdate(userId);

  if (getUser.status === "api-error") {
    throw getUser.error;
  }

  if (getUser.status === "loading") {
    return <Loader />;
  }

  const user = getUser.data;

  function handleSave(userUpdate: UpdateUserRequest) {
    void update(userUpdate).then(({ username }) => {
      const updatedMessage = t("users.user_updated_details", { username });
      void navigate(`/users?updated=${encodeURIComponent(updatedMessage)}`);
    });
  }

  function handleAbort() {
    void navigate("/users");
  }

  return (
    <>
      <PageTitle title={`${user.username} - Abacus`} />
      <header>
        <section>
          <h1>{user.fullname || user.username}</h1>
        </section>
      </header>

      <main>
        {error && (
          <FormLayout.Alert>
            <Alert type="error">{error.message}</Alert>
          </FormLayout.Alert>
        )}

        <UserUpdateForm user={user} onSave={handleSave} onAbort={handleAbort} saving={saving} />
      </main>
    </>
  );
}
