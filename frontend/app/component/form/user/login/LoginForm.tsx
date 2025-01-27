import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { AnyApiError, FatalError, isError, LOGIN_REQUEST_BODY, LOGIN_REQUEST_PATH, useApi } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, BottomBar, Button, InputField } from "@kiesraad/ui";

export function LoginForm() {
  const navigate = useNavigate();
  const client = useApi();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AnyApiError | null>(null);

  // Handle form submission
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    // Submit the credentials to the API
    const formData = new FormData(event.currentTarget);
    const requestPath: LOGIN_REQUEST_PATH = `/api/user/login`;
    const requestBody: LOGIN_REQUEST_BODY = {
      username: formData.get("username") as string,
      password: formData.get("password") as string,
    };
    const result = await client.postRequest(requestPath, requestBody);

    // Handle the result
    setLoading(false);
    if (isError(result)) {
      setError(result);
    } else {
      void navigate("../setup");
    }
  }

  // Propagate fatal errors to the error boundary, which will render an error page
  if (error instanceof FatalError) {
    throw error;
  }

  return (
    <>
      {error && (
        <Alert
          type="error"
          onClose={() => {
            setError(null);
          }}
        >
          {t(`error.api_error.${error.reference}`)}
        </Alert>
      )}
      <form
        className="no_footer"
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <div>
          <InputField
            name="username"
            label={t("user.username")}
            hint={t("user.username_login_hint")}
            readOnly={loading}
            required={true}
          />
          <InputField
            name="password"
            label={t("user.password")}
            hint={t("user.password_login_hint")}
            type="password"
            readOnly={loading}
            required={true}
          />
        </div>
        <BottomBar type="footer">
          <BottomBar.Row>
            <Button type="submit" size="lg" disabled={loading}>
              {t("user.login")}
            </Button>
          </BottomBar.Row>
        </BottomBar>
      </form>
    </>
  );
}
