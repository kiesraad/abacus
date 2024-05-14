import { BottomBar, Button } from "@kiesraad/ui";
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
      <h4>Personaliseer je account</h4>
      <br />
      <label>
        <strong>Gebruikersnaam</strong>
        <br />
        <input name="username" value="Gebruiker01" disabled />
        <br />
        Je kan deze niet aanpassen. Log volgende keer weer met deze gebruikersnaam in.
      </label>
      <br />
      <br />
      <label>
        <strong>Jouw naam</strong> (roepnaam + achternaam)
        <br />
        <input name="name" />
        <br />
        Bijvoorbeeld Karel van Tellingen. Je naam wordt opgenomen in het verslag van deze
        invoersessie.
      </label>
      <br />
      <br />
      <label>
        <strong>Kies nieuw wachtwoord</strong>
        <br />
        <input name="new_password1" type="password" />
        <br />
        Je hebt dit wachtwoord nodig als je na een pauze opnieuw wilt inloggen. Gebruik minimaal 8
        letters en 2 cijfers.
      </label>
      <br />
      <br />
      <label>
        <strong>Herhaal wachtwoord</strong>
        <br />
        <input name="new_password2" type="password" />
        <br />
      </label>
      <BottomBar>
        <Button type="submit">Opslaan</Button>
      </BottomBar>
    </form>
  );
}
