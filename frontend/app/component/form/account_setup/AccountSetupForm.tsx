import { BottomBar, Button, InputField } from "@kiesraad/ui";
import { useNavigate } from "react-router-dom";

interface FormElements extends HTMLFormControlsCollection {
  username: HTMLInputElement;
  password: HTMLInputElement;
}

interface AccountSetupFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function AccountSetupForm() {
  const navigate = useNavigate();
  function handleSubmit(event: React.FormEvent<AccountSetupFormElement>) {
    event.preventDefault();
    navigate("/overview");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h4 className="bold">Personaliseer je account</h4>
      <br />
      <InputField
        name="username"
        label="Gebruikersnaam"
        hint="Je kan deze niet aanpassen. Log volgende keer weer met deze gebruikersnaam in."
        value="Gebruiker01"
        disabled
      />
      <br />
      <br />
      <InputField
        name="name"
        label="Jouw naam"
        subtext="(roepnaam + achternaam)"
        hint="Bijvoorbeeld Karel van Tellingen. Je naam wordt opgenomen in het verslag van deze
        invoersessie."
      />
      <br />
      <br />
      <InputField
        name="new_password1"
        label="Kies nieuw wachtwoord"
        hint="Je hebt dit wachtwoord nodig als je na een pauze opnieuw wilt inloggen. Gebruik minimaal 8 letters en 2 cijfers."
        type="password"
      />
      <br />
      <br />
      <InputField name="new_password2" label="Herhaal wachtwoord" type="password" />
      <br />
      <BottomBar>
        <Button type="submit">Opslaan</Button>
      </BottomBar>
    </form>
  );
}
