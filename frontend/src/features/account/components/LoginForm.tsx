import { FormEvent, useState } from "react";
import { Form, Location, useLocation, useNavigate } from "react-router";

import { AnyApiError, FatalError, isError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { TranslationPath } from "@/i18n/i18n.types";
import { t, tx } from "@/i18n/translate";

interface UnauthorizedState {
  unauthorized?: boolean;
}

export function LoginForm() {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const location = useLocation() as Location<null | UnauthorizedState>;
  const { login, expiration } = useApiState();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AnyApiError | null>(null);

  // show notification if the user is unauthorized or the session expired
  let notification: TranslationPath | null = null;
  if (location.state?.unauthorized === true) {
    const now = new Date();
    if (expiration !== null && expiration.getTime() < now.getTime()) {
      notification = "users.session_expired";
    } else {
      notification = "users.unauthorized";
    }
  }

  // Handle form submission
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    const result = await login(username, password);

    // Handle the result
    setLoading(false);
    if (isError(result)) {
      setError(result);
    } else {
      setError(null);
      setUsername("");
      setPassword("");

      const { fullname, needs_password_change } = result.data;

      if (!fullname || needs_password_change) {
        void navigate("/account/setup");
      } else {
        void navigate("/elections");
      }
    }
  }

  // Propagate fatal errors to the error boundary, which will render an error page
  if (error instanceof FatalError) {
    throw error;
  }

  return (
    <Form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      {notification && (
        <FormLayout.Alert>
          <Alert type="notify">
            <strong className="heading-md">{t(`${notification}_title`)}</strong>
            <p>{tx(notification)}</p>
          </Alert>
        </FormLayout.Alert>
      )}
      {error && (
        <FormLayout.Alert>
          <Alert type="error">
            <strong className="heading-md">{t(`error.api_error.${error.reference}`)}</strong>
          </Alert>
        </FormLayout.Alert>
      )}
      <FormLayout>
        <FormLayout.Section>
          <InputField
            name="username"
            label={t("account.username")}
            hint={t("account.username_login_hint")}
            readOnly={loading}
            required={true}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
          <InputField
            name="password"
            label={t("account.password")}
            hint={t("account.password_login_hint")}
            type="password"
            readOnly={loading}
            required={true}
            value={password}
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
  );
}
