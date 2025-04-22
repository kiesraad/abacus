import { useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, ApiError } from "@/api/ApiResult";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Loader } from "@/components/ui/Loader/Loader";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/lib/i18n";
import { User, USER_GET_REQUEST_PATH } from "@/types/generated/openapi";

import { UserDelete } from "./UserDelete";
import { UserUpdateForm } from "./UserUpdateForm";

export function UserUpdatePage() {
  const navigate = useNavigate();
  const userId = useNumericParam("userId");
  const { requestState: getUser } = useInitialApiGet<User>(`/api/user/${userId}` satisfies USER_GET_REQUEST_PATH);
  const [error, setError] = useState<AnyApiError>();

  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  if (getUser.status === "api-error") {
    throw getUser.error;
  }

  if (getUser.status === "loading") {
    return <Loader />;
  }

  const user = getUser.data;

  function handleSaved({ fullname, username }: User) {
    const updatedMessage = t("users.user_updated_details", { fullname: fullname || username });
    void navigate(`/users?updated=${encodeURIComponent(updatedMessage)}`);
  }

  function handleDeleted() {
    const deletedMessage = t("users.user_deleted_details", { fullname: user.fullname || user.username });
    void navigate(`/users?deleted=${encodeURIComponent(deletedMessage)}`);
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
              <Alert type="error">{t(`error.api_error.${error.reference}`)}</Alert>
            </FormLayout.Alert>
          )}

          <UserUpdateForm user={user} onSaved={handleSaved} onAbort={handleAbort} />
          <UserDelete user={user} onDeleted={handleDeleted} onError={setError} />
        </article>
      </main>
    </>
  );
}
