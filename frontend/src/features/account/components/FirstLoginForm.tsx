import { type FormEvent, type ReactNode, useState } from "react";
import { useNavigate } from "react-router";

import { isError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t, tx } from "@/i18n/translate";

interface FirstLoginFormProps {
  prev: () => void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function FirstLoginForm({ prev }: FirstLoginFormProps) {
  const { login } = useApiState();
  const navigator = useNavigate();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  // Handle form submission
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (isError(result)) {
      setError(true);
    } else {
      void navigator("/elections");
    }
  }

  const link = (content: ReactNode) => (
    <Button
      variant="underlined"
      size="md"
      onClick={(e) => {
        e.preventDefault();
        prev();
      }}
    >
      {content}
    </Button>
  );

  return (
    <>
      <header>
        <section>
          <h1>{t("initialise.login_to_admin_account")}</h1>
        </section>
      </header>
      <main>
        <article>
          {error ? (
            <FormLayout.Alert>
              <Alert type="error">
                <strong className="heading-md">{t("error.api_error.InvalidUsernameOrPassword")}</strong>
              </Alert>
            </FormLayout.Alert>
          ) : (
            <FormLayout.Alert>
              <Alert type="success">
                <strong className="heading-md">{t("initialise.admin_configured")}</strong>
              </Alert>
            </FormLayout.Alert>
          )}

          <Form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <FormLayout>
              <FormLayout.Section>
                {tx("initialise.login_to_finish_setup", { link })}

                <InputField
                  id="username"
                  name="username"
                  label={t("account.username")}
                  hint={t("initialise.username_login_hint")}
                  required={true}
                  value={username}
                  readOnly={loading}
                  onChange={(e) => {
                    setUsername(e.target.value);
                  }}
                />
                <InputField
                  id="password"
                  name="password"
                  label={t("account.password")}
                  hint={t("initialise.password_login_hint")}
                  type="password"
                  required={true}
                  value={password}
                  readOnly={loading}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                />
              </FormLayout.Section>
              <FormLayout.Controls>
                <Button type="submit" disabled={loading}>
                  {t("account.login")}
                </Button>
              </FormLayout.Controls>
            </FormLayout>
          </Form>
        </article>
      </main>
    </>
  );
}
