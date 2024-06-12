import { Badge, Button, InputField } from "@kiesraad/ui";
import { useNavigate } from "react-router-dom";
import { IconChevronright } from "@kiesraad/icon";

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
      <h2 className="form_title">Welk stembureau ga je invoeren?</h2>
      <InputField
        name="number"
        label="Voer het nummer in:"
        width="narrow"
        margin={false}
        pattern="\d+"
        title="Alleen positieve nummers toegestaan"
      />
      <p className="md">
        Klopt de naam van het stembureau met de naam op je papieren proces verbaal?
        <br />
        Dan kan je beginnen.
      </p>
      <div>
        <Button type="submit" size="lg">
          Beginnen
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </div>
      <details>
        <summary>
          <p>
            Weet je het nummer niet?
            <br />
            <span className="underlined">Bekijk de lijst met alle stembureaus</span>
          </p>
        </summary>
        <h2 className="form_title table_title">Kies het stembureau</h2>
        <table id="polling_station_list" className="overview_table">
          <thead>
            <tr>
              <th className="align-center">Nummer</th>
              <th>Stembureau</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="align-right narrow bold">1</td>
              <td>
                <span>Nachthemelstraat 21</span>
                <Badge type="first_entry" />
              </td>
              <td className="align-center link">
                <a href="/input/030">
                  <IconChevronright />
                </a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">2</td>
              <td>
                <span>Schoolstraat 78</span>
                <Badge type="second_entry" />
              </td>
              <td className="align-center link">
                <a href="/input/030">
                  <IconChevronright />
                </a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">3</td>
              <td>
                <span>Fluisterbosdreef 8</span>
                <Badge type="extra_entry" />
              </td>
              <td className="align-center link">
                <a href="/input/030">
                  <IconChevronright />
                </a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">4</td>
              <td>
                <span>Wilhelminastraat 21</span>
                <Badge type="objections" />
              </td>
              <td className="align-center link">
                <a href="/input/030">
                  <IconChevronright />
                </a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">5</td>
              <td>
                <span>Tuinstraat 2</span>
                <Badge type="difference" />
              </td>
              <td className="align-center link">
                <a href="/input/030">
                  <IconChevronright />
                </a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">6</td>
              <td>
                <span>Rietland 31</span>
                <Badge type="correction" />
              </td>
              <td className="align-center link">
                <a href="/input/030">
                  <IconChevronright />
                </a>
              </td>
            </tr>
            <tr>
              <td className="align-right narrow bold">7</td>
              <td>
                <span>Grote Markt 1</span>
                <Badge type="definitive" />
              </td>
              <td className="align-center link">
                <a href="/input/030">
                  <IconChevronright />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </form>
  );
}
