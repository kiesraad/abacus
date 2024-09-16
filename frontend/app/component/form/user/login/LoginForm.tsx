import { useNavigate } from "react-router-dom";

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

  function handleSubmit(event: React.FormEvent<LoginFormElement>) {
    event.preventDefault();
    navigate("../account/setup");
  }

  return (
    <form className="no_footer" onSubmit={handleSubmit}>
      <InputField
        name="username"
        label="Gebruikersnaam"
        hint="De naam op het briefje dat je van de coördinator hebt gekregen."
      />
      <InputField
        name="password"
        label="Wachtwoord"
        hint="Eerder ingelogd? Vul het wachtwoord in dat je zelf hebt ingesteld. Nog niet eerder ingelogd? Gebruik het wachtwoord dat je van de coördinator hebt gekregen."
        type="password"
      />
      <BottomBar type="footer">
        <BottomBar.Row>
          <Button type="submit" size="lg">
            Inloggen
          </Button>
        </BottomBar.Row>
      </BottomBar>
    </form>
  );
}
