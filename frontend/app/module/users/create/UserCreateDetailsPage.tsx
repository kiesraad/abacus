import { Navigate, useNavigate } from "react-router";

import { UserCreateDetailsForm } from "app/module/users/create/UserCreateDetailsForm";

import type { User } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

import { useUserCreateContext } from "./useUserCreateContext";

export function UserCreateDetailsPage() {
  const navigate = useNavigate();
  const { role, type } = useUserCreateContext();

  function handleSubmitted({ username, role }: User) {
    const createdMessage = t("users.user_created_details", { username, role: t(role) });
    void navigate(`/users?created=${encodeURIComponent(createdMessage)}`);
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
