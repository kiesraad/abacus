import { useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, ApiError } from "@/api/ApiResult";
import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";
import { USER_GET_REQUEST_PATH, User } from "@/types/generated/openapi";

import { UserDelete } from "./UserDelete";
import { UserUpdateForm } from "./UserUpdateForm";

export function UserUpdatePage() {
  const navigate = useNavigate();
  const loggedInUser = useUser();
  const userId = useNumericParam("userId");
  const { requestState: getUser } = useInitialApiGetWithErrors<User>(
    `/api/users/${userId}` satisfies USER_GET_REQUEST_PATH,
  );
  const [error, setError] = useState<AnyApiError>();

  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  if (getUser.status === "loading") {
    return <Loader />;
  } else if (getUser.status !== "success") {
    throw getUser.error;
  }

  const user = getUser.data;
  const itsMe = loggedInUser?.user_id === userId;

  function handleSaved({ fullname, username }: User) {
    const updatedMessage = t("users.user_updated_details", { fullname: fullname || username });
    void navigate(`/users?updated=${encodeURIComponent(updatedMessage)}`);
  }

  function handleDeleted() {
    const deletedMessage = t("users.user_deleted_details", { fullname: user.fullname || user.username });
    void navigate(`/users?deleted=${encodeURIComponent(deletedMessage)}`, { replace: true });
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
              <Alert type="error">
                <p>{t(`error.api_error.${error.reference}`)}</p>
              </Alert>
            </FormLayout.Alert>
          )}

          <UserUpdateForm user={user} onSaved={handleSaved} onAbort={handleAbort} />
          {!itsMe && <UserDelete user={user} onDeleted={handleDeleted} onError={setError} />}
        </article>
      </main>
    </>
  );
}
