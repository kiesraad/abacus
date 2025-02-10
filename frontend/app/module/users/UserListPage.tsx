import { useUserListRequest } from "app/module/users/useUserListRequest";

import { t } from "@kiesraad/i18n";
import { IconPlus } from "@kiesraad/icon";
import { Button, Loader, PageTitle, Table, Toolbar } from "@kiesraad/ui";
import { formatDateTime } from "@kiesraad/util";

export function UserListPage() {
  const { requestState } = useUserListRequest();

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if ("error" in requestState) {
    throw requestState.error;
  }

  const users = requestState.data.users;

  return (
    <>
      <PageTitle title={`${t("users.management")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.management")}</h1>
        </section>
      </header>
      <main>
        <article>
          <Toolbar>
            <Button.Link variant="secondary" size="sm" to={"./create"}>
              <IconPlus /> {t("users.add")}
            </Button.Link>
          </Toolbar>

          <Table id="users">
            <Table.Header>
              <Table.Column>{t("users.username")}</Table.Column>
              <Table.Column>{t("role")}</Table.Column>
              <Table.Column>{t("users.fullname")}</Table.Column>
              <Table.Column>{t("users.last_activity")}</Table.Column>
              <Table.Column />
            </Table.Header>
            <Table.Body className="fs-md">
              {users.map((user) => (
                <Table.LinkRow key={user.id} to={`${user.id}/update`}>
                  <Table.Cell>{user.username}</Table.Cell>
                  <Table.Cell>{t(user.role)}</Table.Cell>
                  <Table.Cell>{user.fullname ?? <span className="text-muted">{t("users.not_used")}</span>}</Table.Cell>
                  <Table.Cell>
                    {user.last_activity_at ? formatDateTime(new Date(user.last_activity_at)) : "–"}
                  </Table.Cell>
                  <Table.Cell />
                </Table.LinkRow>
              ))}
            </Table.Body>
          </Table>
        </article>
      </main>
    </>
  );
}
