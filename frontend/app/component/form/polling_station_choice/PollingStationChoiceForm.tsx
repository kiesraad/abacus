import { BottomBar, Button } from "@kiesraad/ui";
import { useNavigate } from "react-router-dom";
import { IconChevronRight } from "@kiesraad/icon";
import { PollingStation, PollingStationsContext } from "@kiesraad/api";
import { PollingStationSelector } from "./PollingStationSelector";
import { useContext } from "react";

interface FormElements extends HTMLFormControlsCollection {
  number: HTMLInputElement;
}

interface PollingStationChoiceFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function PollingStationChoiceForm() {
  const navigate = useNavigate();

  const { pollingStations, pollingStationsLoading } = useContext(PollingStationsContext);

  const handleRowClick = (pollingStationNumber: number) => () => {
    navigate(`./${pollingStationNumber}`);
  };
  function handleSubmit(event: React.FormEvent<PollingStationChoiceFormElement>) {
    event.preventDefault();
    navigate("./030/recounted");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="form_title">Welk stembureau ga je invoeren?</h2>
      <PollingStationSelector />
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
        {pollingStationsLoading ? (
          <div>aan het zoeken …</div>
        ) : (
          <>
            <table id="polling_station_list" className="overview_table">
              <thead>
                <tr>
                  <th className="align-center">Nummer</th>
                  <th>Stembureau</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pollingStations.map((pollingStation: PollingStation) => (
                  <tr onClick={handleRowClick(pollingStation.number)} key={pollingStation.number}>
                    <td width="6.5rem" className="number">
                      {pollingStation.number}
                    </td>
                    <td>
                      <span>{pollingStation.name}</span>
                      {/* TODO: <Badge type="first_entry" />*/}
                    </td>
                    <td width="5rem">
                      <div className="link">
                        <IconChevronRight />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </details>
    </form>
  );
}
