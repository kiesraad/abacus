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
  const { id } = useParams();
  const navigate = useNavigate();
  const pollingStations = usePollingStationListRequest({
    //election_id: parseInt(id || ""),
    election_id: 1, // TODO
  });
  
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
        <table id="polling_station_list" className="overview_table">
          <thead>
            <tr>
              <th className="align-center">Nummer</th>
              <th>Stembureau</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pollingStations.data?.polling_stations.map((pollingStation: any) => (
              <tr onClick={handleRowClick(pollingStation.number)} key={pollingStation.number}>
                <td width="6.5rem" className="number">
                  {pollingStation.number}
                </td>
                <td>
                  <span>{pollingStation.name}</span>
                  <Badge type="first_entry" />
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
      </details>
    </form>
  );
}
