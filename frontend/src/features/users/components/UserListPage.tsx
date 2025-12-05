import { IconPlus } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Table } from "@/components/ui/Table/Table";
import { Toolbar } from "@/components/ui/Toolbar/Toolbar";
import { t } from "@/i18n/translate";
import { Role } from "@/types/generated/openapi";
import { formatDateTime } from "@/utils/dateTime";

import { useQueryParam } from "../hooks/useQueryParam";
import { useUserListRequest } from "../hooks/useUserListRequest";

export function UserListPage() {
  const { requestState } = useUserListRequest();
  const [createdMessage, clearCreatedMessage] = useQueryParam("created");
  const [updatedMessage, clearUpdatedMessage] = useQueryParam("updated");
  const [deletedMessage, clearDeletedMessage] = useQueryParam("deleted");

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if ("error" in requestState) {
    throw requestState.error;
  }

  const users = requestState.data.users;

  const sortedRoles: Role[] = ["administrator", "coordinator", "typist"];
  users.sort((a, b) => {
    const roleCompare = sortedRoles.indexOf(a.role) - sortedRoles.indexOf(b.role);
    if (roleCompare !== 0) {
      return roleCompare;
    }
    return a.username.localeCompare(b.username);
  });

  return (
    <>
      <PageTitle title={`${t("users.manage")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.manage")}</h1>
        </section>
      </header>

      {createdMessage && (
        <Alert type="success" onClose={clearCreatedMessage}>
          <strong className="heading-md">{t("users.user_created")}</strong>
          <p>{createdMessage}</p>
        </Alert>
      )}

      {updatedMessage && (
        <Alert type="success" onClose={clearUpdatedMessage}>
          <strong className="heading-md">{t("users.user_updated")}</strong>
          <p>{updatedMessage}</p>
        </Alert>
      )}

      {deletedMessage && (
        <Alert type="success" onClose={clearDeletedMessage}>
          <strong className="heading-md">{t("users.user_deleted")}</strong>
          <p>{deletedMessage}</p>
        </Alert>
      )}

      <main>
        <article>
          <Toolbar>
            <Button.Link variant="secondary" size="sm" to={"./create"}>
              <IconPlus /> {t("users.add")}
            </Button.Link>
          </Toolbar>

          <Table id="users">
            <Table.Header>
              <Table.HeaderCell>{t("users.username")}</Table.HeaderCell>
              <Table.HeaderCell>{t("role")}</Table.HeaderCell>
              <Table.HeaderCell>{t("users.fullname")}</Table.HeaderCell>
              <Table.HeaderCell>{t("users.last_activity")}</Table.HeaderCell>
            </Table.Header>
            <Table.Body className="fs-md">
              {users.map((user) => (
                <Table.Row key={user.id} to={`${user.id}/update`}>
                  <Table.Cell>{user.username}</Table.Cell>
                  <Table.Cell>{t(user.role)}</Table.Cell>
                  <Table.Cell>{user.fullname || <span className="text-muted">{t("users.not_used")}</span>}</Table.Cell>
                  <Table.Cell>
                    {user.last_activity_at ? formatDateTime(new Date(user.last_activity_at)) : "–"}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </article>
      </main>
    </>
  );
}
