import { useNavigate } from "react-router-dom";

import { IconChevronRight } from "@kiesraad/icon";
import { Badge, BottomBar, Button, InputField } from "@kiesraad/ui";

interface FormElements extends HTMLFormControlsCollection {
  number: HTMLInputElement;
}

interface PollingStationChoiceFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function PollingStationChoiceForm() {
  const navigate = useNavigate();
  const handleRowClick = () => {
    navigate(`./030/recounted`);
  };
  function handleSubmit(event: React.FormEvent<PollingStationChoiceFormElement>) {
    event.preventDefault();
    navigate("./030/recounted");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="form_title">Welk stembureau ga je invoeren?</h2>
      <InputField
        id="pollingStation"
        name="number"
        label="Voer het nummer in:"
        fieldWidth="narrow"
        margin={false}
        pattern="\d+"
        title="Alleen positieve nummers toegestaan"
        maxLength={6}
      />
      <p className="md">
        Klopt de naam van het stembureau met de naam op je papieren proces verbaal?
        <br />
        Dan kan je beginnen.
      </p>
      <BottomBar type="form">
        <Button type="submit" size="lg">
          Beginnen
        </Button>
        <span className="button_hint">SHIFT + Enter</span>
      </BottomBar>
      <details>
        <summary>
          <p>
            Weet je het nummer niet?
            <br />
            <span id="openPollingStationList" className="underlined pointer">
              Bekijk de lijst met alle stembureaus
            </span>
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
            <tr onClick={handleRowClick}>
              <td width="6.5rem" className="number">
                1
              </td>
              <td>
                <span>Nachthemelstraat 21</span>
                <Badge type="first_entry" />
              </td>
              <td width="5rem">
                <div className="link">
                  <IconChevronRight />
                </div>
              </td>
            </tr>
            <tr onClick={handleRowClick}>
              <td width="6.5rem" className="number">
                2
              </td>
              <td>
                <span>Schoolstraat 78</span>
                <Badge type="second_entry" />
              </td>
              <td width="5rem">
                <div className="link">
                  <IconChevronRight />
                </div>
              </td>
            </tr>
            <tr onClick={handleRowClick}>
              <td width="6.5rem" className="number">
                3
              </td>
              <td>
                <span>Fluisterbosdreef 8</span>
                <Badge type="extra_entry" />
              </td>
              <td width="5rem">
                <div className="link">
                  <IconChevronRight />
                </div>
              </td>
            </tr>
            <tr onClick={handleRowClick}>
              <td width="6.5rem" className="number">
                4
              </td>
              <td>
                <span>Wilhelminastraat 21</span>
                <Badge type="objections" />
              </td>
              <td width="5rem">
                <div className="link">
                  <IconChevronRight />
                </div>
              </td>
            </tr>
            <tr onClick={handleRowClick}>
              <td width="6.5rem" className="number">
                5
              </td>
              <td>
                <span>Tuinstraat 2</span>
                <Badge type="difference" />
              </td>
              <td width="5rem">
                <div className="link">
                  <IconChevronRight />
                </div>
              </td>
            </tr>
            <tr onClick={handleRowClick}>
              <td width="6.5rem" className="number">
                6
              </td>
              <td>
                <span>Rietland 31</span>
                <Badge type="correction" />
              </td>
              <td width="5rem">
                <div className="link">
                  <IconChevronRight />
                </div>
              </td>
            </tr>
            <tr onClick={handleRowClick}>
              <td width="6.5rem" className="number">
                7
              </td>
              <td>
                <span>Grote Markt 1</span>
                <Badge type="definitive" />
              </td>
              <td width="5rem">
                <div className="link">
                  <IconChevronRight />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </form>
  );
}
