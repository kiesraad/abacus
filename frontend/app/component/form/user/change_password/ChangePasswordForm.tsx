import { FormEvent, useState } from "react";

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

const INITIAL_FORM_STATE = {
  password: "",
  newPassword: "",
  newPasswordRepeat: "",
};

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
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<AnyApiError | TranslationPath | null>(null);

  // Handle form submission
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validate the form
    if (formState.newPassword !== formState.newPasswordRepeat) {
      setError("account.password_mismatch");
      return;
    }

    // Submit the credentials to the API
    setLoading(true);
    const requestPath: CHANGE_PASSWORD_REQUEST_PATH = "/api/user/change-password";
    const requestBody: CHANGE_PASSWORD_REQUEST_BODY = {
      username: user?.username as string,
      password: formState.password,
      new_password: formState.newPassword,
    };
    const result = await client.postRequest<LoginResponse>(requestPath, requestBody);

    // Handle the result
    setLoading(false);
    if (isError(result)) {
      setError(result);
      setSuccess(false);
    } else {
      setFormState(INITIAL_FORM_STATE);
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
              <h2>{t("account.password_changed")}</h2>
            </Alert>
          </FormLayout.Alert>
        )}
        <h2 className="mb-lg">
          {t("account.username")}: {user.username}
        </h2>
        <InputField
          name="password"
          label={t("account.password")}
          hint={t("account.current_password_hint")}
          type="password"
          value={formState.password}
          onChange={(e) => {
            setFormState({ ...formState, password: e.target.value });
          }}
        />
        <InputField
          name="new_password"
          label={t("account.password_new")}
          hint={t("account.password_new")}
          type="password"
          value={formState.newPassword}
          onChange={(e) => {
            setFormState({ ...formState, newPassword: e.target.value });
          }}
        />
        <InputField
          name="new_password_repeat"
          label={t("account.password_repeat")}
          type="password"
          value={formState.newPasswordRepeat}
          onChange={(e) => {
            setFormState({ ...formState, newPasswordRepeat: e.target.value });
          }}
        />
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
