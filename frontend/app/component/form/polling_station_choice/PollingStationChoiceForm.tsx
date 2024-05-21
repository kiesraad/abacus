import { Button, InputField } from "@kiesraad/ui";
import { useNavigate } from "react-router-dom";

interface FormElements extends HTMLFormControlsCollection {
  number: HTMLInputElement;
}

interface PollingStationChoiceFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function PollingStationChoiceForm() {
  const navigate = useNavigate();

  function handleSubmit(event: React.FormEvent<PollingStationChoiceFormElement>) {
    event.preventDefault();
    navigate("./030");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h4 className="bold">Welk stembureau ga je invoeren?</h4>
      <br />
      <InputField
        name="number"
        label="Voer het nummer in:"
        type="number"
        width="narrow"
        margin={false}
      />
      <span>
        Klopt de naam van het stembureau met de naam op je papieren proces verbaal?
        <br />
        Dan kan je beginnen.
      </span>
      <br />
      <br />
      <br />
      <Button type="submit" size="lg">
        Beginnen
      </Button>
      <span className="button_hint">SHIFT + Enter</span>
      <br />
      <br />
      <br />
      <details>
        <summary>
          <span>Weet je het nummer niet?</span>
          <br />
          <span className="underlined">Bekijk de lijst met alle stembureaus</span>
        </summary>
        <br />
        <br />
        <h4 className="bold">Kies het stembureau</h4>
        <br />
        <table id="polling_station_list" className="overview_table">
          <thead>
            <tr>
              <th className="align-center">Nummer</th>
              <th>Stembureau</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {/* TODO: Add icons and labels once Ellen has dev mode access to Figma again */}
            <tr>
              <td className="align-right narrow bold">1</td>
              <td>Nachthemelstraat 21 1e invoer</td>
              <td className="align-center link">
                <a href="/input/030">Link</a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">2</td>
              <td>Schoolstraat 78 1e invoer</td>
              <td className="align-center link">
                <a href="/input/030">Link</a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">3</td>
              <td>Fluisterbosdreef 8 2e invoer</td>
              <td className="align-center link">
                <a href="/input/030">Link</a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">4</td>
              <td>Wilhelminastraat 21 2e invoer</td>
              <td className="align-center link">
                <a href="/input/030">Link</a>
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </form>
  );
}
