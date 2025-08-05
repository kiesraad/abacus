import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { isError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t, tx } from "@/i18n/translate";

interface FirstLoginFormProps {
  prev: () => void;
}

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

  const link = (content: React.ReactNode) => (
    <a
      href="#previous"
      onClick={(e) => {
        e.preventDefault();
        prev();
      }}
    >
      {content}
    </a>
  );

  return (
    <>
      <header>
        <section>
          <h1>{t("initialise.create_admin_account")}</h1>
        </section>
      </header>
      <main>
        <article>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <FormLayout>
              {error ? (
                <FormLayout.Alert>
                  <Alert type="error">
                    <h2>{t("initialise.login_error")}</h2>
                    <p>{tx("initialise.reconfigure_admin_account", { link })}</p>
                  </Alert>
                </FormLayout.Alert>
              ) : (
                <FormLayout.Alert>
                  <Alert type="notify">
                    <h2>{t("initialise.admin_configured")}</h2>
                    <p>{tx("initialise.login_to_finish_setup", { link })}</p>
                  </Alert>
                </FormLayout.Alert>
              )}
              <InputField
                name="username"
                label={t("account.username")}
                hint={t("initialise.username_login_hint")}
                required={true}
                value={username}
                disabled={loading}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
              />
              <InputField
                name="password"
                label={t("account.password")}
                hint={t("initialise.password_login_hint")}
                type="password"
                required={true}
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
              <Button type="submit" size="lg" disabled={loading}>
                {t("account.login")}
              </Button>
            </FormLayout>
          </form>
        </article>
      </main>
    </>
  );
}
