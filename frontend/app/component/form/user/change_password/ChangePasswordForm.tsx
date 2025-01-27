import { createRef, FormEvent, useState } from "react";

import {
  AnyApiError,
  ApiError,
  CHANGE_PASSWORD_REQUEST_BODY,
  CHANGE_PASSWORD_REQUEST_PATH,
  FatalApiError,
  isError,
  LoginResponse,
  useApiState,
} from "@kiesraad/api";
import { t, TranslationPath } from "@kiesraad/i18n";
import { Alert, BottomBar, Button, FormLayout, InputField, Loader } from "@kiesraad/ui";

function errorMessage(error: AnyApiError | TranslationPath) {
  if (typeof error === "string") {
    return t(error);
  }

  if (error instanceof ApiError || error instanceof FatalApiError) {
    return t(`error.api_error.${error.reference}`);
  }

  throw error;
}

export function ChangePasswordForm() {
  const { user, client } = useApiState();
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const ref = createRef<HTMLFormElement>();
  const [error, setError] = useState<AnyApiError | TranslationPath | null>(null);

  // Handle form submission
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validate the form
    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("new_password") as string;
    const newPasswordRepeat = formData.get("new_password_repeat") as string;
    if (newPassword !== newPasswordRepeat) {
      setError("user.password_mismatch");
      return;
    }

    // Submit the credentials to the API
    setLoading(true);
    const requestPath: CHANGE_PASSWORD_REQUEST_PATH = "/api/user/change-password";
    const requestBody: CHANGE_PASSWORD_REQUEST_BODY = {
      username: user?.username as string,
      password: formData.get("password") as string,
      new_password: formData.get("new_password") as string,
    };
    const result = await client.postRequest<LoginResponse>(requestPath, requestBody);

    // Handle the result
    setLoading(false);
    if (isError(result)) {
      setError(result);
      setSuccess(false);
    } else {
      ref.current?.reset();
      setError(null);
      setSuccess(true);
    }
  }

  if (!user) {
    return <Loader />;
  }

  return (
    <form
      className="no_footer"
      ref={ref}
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
    >
      <FormLayout>
        {error && (
          <FormLayout.Alert>
            <Alert
              type="error"
              onClose={() => {
                setError(null);
              }}
              margin="mb-lg"
            >
              <h2>{errorMessage(error)}</h2>
            </Alert>
          </FormLayout.Alert>
        )}
        {success && (
          <FormLayout.Alert>
            <Alert
              type="success"
              onClose={() => {
                setError(null);
              }}
              margin="mb-lg"
            >
              <h2>{t("user.password_changed")}</h2>
            </Alert>
          </FormLayout.Alert>
        )}
        <h2 className="mb-lg">
          {t("user.username")}: {user.username}
        </h2>
        <InputField name="password" label={t("user.password")} hint={t("user.current_password_hint")} type="password" />
        <InputField name="new_password" label={t("user.password_new")} hint={t("user.password_new")} type="password" />
        <InputField name="new_password_repeat" label={t("user.password_repeat")} type="password" />
      </FormLayout>
      <BottomBar type="footer">
        <BottomBar.Row>
          <Button type="submit" size="lg" disabled={loading}>
            {t("save")}
          </Button>
        </BottomBar.Row>
      </BottomBar>
    </form>
  );
}
