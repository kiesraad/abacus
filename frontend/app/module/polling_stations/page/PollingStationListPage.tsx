import { useSearchParams } from "react-router";

import { useElection, usePollingStationListRequest } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconPlus } from "@kiesraad/icon";
import { Alert, Button, Loader, PageTitle, Table, Toolbar } from "@kiesraad/ui";

export function PollingStationListPage() {
  const { election } = useElection();
  const [searchParams, setSearchParams] = useSearchParams();
  const { requestState } = usePollingStationListRequest(election.id);

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if ("error" in requestState) {
    throw requestState.error;
  }

  const data = requestState.data;

  const updatedId = searchParams.get("updated");
  const updatedPollingStation = updatedId ? data.polling_stations.find((ps) => ps.id === parseInt(updatedId)) : null;

  const createdId = searchParams.get("created");
  const createdPollingStation = createdId ? data.polling_stations.find((ps) => ps.id === parseInt(createdId)) : null;

  const deletedPollingStation = searchParams.get("deleted");

  function closeAlert() {
    setSearchParams("");
  }

  const labelForPollingStationType = {
    FixedLocation: t("polling_station.type.FixedLocation"),
    Special: t("polling_station.type.Special"),
    Mobile: t("polling_station.type.Mobile"),
  };
  //TODO: Table needs highlight option
  //TODO: Alert has some layout glitches
  return (
    <>
      <PageTitle title={`${t("polling_stations")} - Abacus`} />
      <header>
        <section>
          <h1>{t("polling_station.title.plural")}</h1>
        </section>
      </header>
      {updatedPollingStation && (
        <Alert type="success" onClose={closeAlert}>
          <strong>
            {t("polling_station.message.polling_station_updated", {
              number: updatedPollingStation.number,
              name: updatedPollingStation.name,
            })}
          </strong>
        </Alert>
      )}

      {createdPollingStation && (
        <Alert type="success" onClose={closeAlert}>
          <strong>
            {t("polling_station.message.polling_station_created", {
              number: createdPollingStation.number,
              name: createdPollingStation.name,
            })}
          </strong>
        </Alert>
      )}

      {deletedPollingStation && (
        <Alert type="success" onClose={closeAlert}>
          <strong>
            {t("polling_station.message.polling_station_deleted", { pollingStation: deletedPollingStation })}
          </strong>
        </Alert>
      )}
      <main>
        {!data.polling_stations.length ? (
          <article>
            <h2>{t("polling_station.title.how_to_add")}</h2>
            <p className="mb-lg">{t("polling_station.message.no_polling_stations")}</p>

            <Toolbar>
              <Toolbar.Section pos="start">
                <Button.Link variant="secondary" size="sm" to="./create">
                  <IconPlus /> {t("manual_input")}
                </Button.Link>
              </Toolbar.Section>
            </Toolbar>
          </article>
        ) : (
          <article>
            <Toolbar>
              <Toolbar.Section pos="end">
                <Button.Link variant="secondary" size="sm" to="./create">
                  <IconPlus /> {t("polling_station.form.create")}
                </Button.Link>
              </Toolbar.Section>
            </Toolbar>

            <Table id="polling_stations">
              <Table.Header>
                <Table.Column className="text-align-r">{t("number")}</Table.Column>
                <Table.Column>{t("name")}</Table.Column>
                <Table.Column>{t("type")}</Table.Column>
                <Table.Column />
              </Table.Header>
              <Table.Body className="fs-md">
                {data.polling_stations.map((station) => (
                  <Table.LinkRow key={station.id} to={`${station.id}/update`}>
                    <Table.NumberCell className="text-align-r">{station.number}</Table.NumberCell>
                    <Table.Cell className="break-word">{station.name}</Table.Cell>
                    <Table.Cell>
                      {station.polling_station_type && labelForPollingStationType[station.polling_station_type]}
                    </Table.Cell>
                    <Table.Cell />
                  </Table.LinkRow>
                ))}
              </Table.Body>
            </Table>
          </article>
        )}
      </main>
    </>
  );
}
