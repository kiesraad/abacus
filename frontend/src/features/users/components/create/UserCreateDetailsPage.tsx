import { Navigate, useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { useMessages } from "@/hooks/messages/useMessages";
import { t } from "@/i18n/translate";
import type { User } from "@/types/generated/openapi";
import { useUserCreateContext } from "../../hooks/useUserCreateContext";
import { UserCreateDetailsForm } from "./UserCreateDetailsForm";

export function UserCreateDetailsPage() {
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const { role, type } = useUserCreateContext();

  function handleSubmitted({ username, role }: User) {
    pushMessage({
      title: t("users.user_created"),
      text: t("users.user_created_details", { username, role: t(role) }),
    });

    void navigate("/users");
  }

  if (!role || !type) {
    return <Navigate to="/users/create" />;
  }

  return (
    <>
      <PageTitle title={`${t("users.add")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.add_role", { role: t(role) })}</h1>
        </section>
      </header>
      <main>
        <article>
          <UserCreateDetailsForm role={role} showFullname={type === "fullname"} onSubmitted={handleSubmitted} />
        </article>
      </main>
    </>
  );
}
