import { useNavigate } from "react-router";

import { UpdateUserRequest, useApiRequest, User, USER_GET_REQUEST_PATH } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, FormLayout, Loader, PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

import { UserDelete } from "./UserDelete";
import { UserUpdateForm } from "./UserUpdateForm";
import { useUserUpdate } from "./useUserUpdate";

export function UserUpdatePage() {
  const navigate = useNavigate();
  const userId = useNumericParam("userId");
  const { requestState: getUser } = useApiRequest<User>(`/api/user/${userId}` satisfies USER_GET_REQUEST_PATH);
  const { error, update, remove, saving } = useUserUpdate(userId);

  if (getUser.status === "api-error") {
    throw getUser.error;
  }

  if (getUser.status === "loading") {
    return <Loader />;
  }

  const user = getUser.data;

  function handleSave(userUpdate: UpdateUserRequest) {
    void update(userUpdate).then(({ fullname, username }) => {
      const updatedMessage = t("users.user_updated_details", { fullname: fullname || username });
      void navigate(`/users?updated=${encodeURIComponent(updatedMessage)}`);
    });
  }

  function handleDelete() {
    void remove().then(() => {
      const deletedMessage = t("users.user_deleted_details", { fullname: user.fullname || user.username });
      void navigate(`/users?deleted=${encodeURIComponent(deletedMessage)}`);
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
        <article>
          {error && (
            <FormLayout.Alert>
              <Alert type="error">{error.message}</Alert>
            </FormLayout.Alert>
          )}

          <UserUpdateForm user={user} onSave={handleSave} onAbort={handleAbort} saving={saving} />
          <UserDelete onDelete={handleDelete} saving={saving} />
        </article>
      </main>
    </>
  );
}
