import { BottomBar, Button } from "@kiesraad/ui";
import { useNavigate } from "react-router-dom";

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
    navigate("account/setup");
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <strong>Gebruikersnaam</strong>
        <br />
        <input name="username" />
        <br />
        De naam op het briefje dat je van de coördinator hebt gekregen.
      </label>
      <br />
      <br />
      <label>
        <strong>Wachtwoord</strong>
        <br />
        <input name="password" type="password" />
        <br />
        Eerder ingelogd? Vul het wachtwoord in dat je zelf hebt ingesteld. Nog niet eerder ingelogd?
        Gebruik het wachtwoord dat je van de coördinator hebt gekregen.
      </label>
      <BottomBar>
        <Button type="submit">Inloggen</Button>
      </BottomBar>
    </form>
  );
}
