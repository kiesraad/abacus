import { FormEvent, useState } from "react";
import { Location, useLocation, useNavigate } from "react-router";

import { AnyApiError, FatalError, isError, useApiState } from "@kiesraad/api";
import { t, TranslationPath } from "@kiesraad/i18n";
import { Alert, BottomBar, Button, FormLayout, InputField } from "@kiesraad/ui";

interface UnauthorizedState {
  unauthorized?: boolean;
}

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation() as Location<null | UnauthorizedState>;
  const { login, expiration } = useApiState();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AnyApiError | null>(null);

  // show warning if the user is unauthorized or the session expired
  let warning: TranslationPath | null = null;
  if (location.state?.unauthorized === true) {
    const now = new Date();
    if (expiration !== null && expiration.getTime() < now.getTime()) {
      warning = "users.session_expired";
    } else {
      warning = "users.unauthorized";
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
        void navigate("../setup");
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
    <form
      className="no_footer"
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <FormLayout>
        {warning && (
          <FormLayout.Alert>
            <Alert type="warning" margin="mb-lg">
              <h2>{t(warning)}</h2>
            </Alert>
          </FormLayout.Alert>
        )}
        {error && (
          <FormLayout.Alert>
            <Alert type="error" margin="mb-lg">
              <h2>{t(`error.api_error.${error.reference}`)}</h2>
            </Alert>
          </FormLayout.Alert>
        )}
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
      </FormLayout>
      <BottomBar type="footer">
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={loading}>
            {t("account.login")}
          </Button>
        </BottomBar.Row>
      </BottomBar>
    </form>
  );
}
