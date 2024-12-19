import { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { t } from "@kiesraad/i18n";
import { BottomBar, Button, InputField } from "@kiesraad/ui";

interface FormElements extends HTMLFormControlsCollection {
  username: HTMLInputElement;
  password: HTMLInputElement;
}

interface LoginFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function LoginForm() {
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<LoginFormElement>) {
    event.preventDefault();
    navigate("../account/setup");
  }

  return (
    <form className="no_footer" onSubmit={handleSubmit}>
      <div>
        <InputField name="username" label={t("user.username")} hint={t("user.username_login_hint")} />
        <InputField name="password" label={t("user.password")} hint={t("user.password_login_hint")} type="password" />
      </div>
      <BottomBar type="footer">
        <BottomBar.Row>
          <Button type="submit" size="lg">
            {t("user.login")}
          </Button>
        </BottomBar.Row>
      </BottomBar>
    </form>
  );
}
