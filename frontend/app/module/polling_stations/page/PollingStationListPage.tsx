import { useNavigate, useSearchParams } from "react-router-dom";

import { usePollingStationListRequest } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconPlus } from "@kiesraad/icon";
import { Alert, Button, Loader, PageTitle, Table, Toolbar } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationListPage() {
  const electionId = useNumericParam("electionId");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { requestState } = usePollingStationListRequest(electionId);

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

  const closeAlert = () => {
    setSearchParams("");
  };

  const labelForPollingStationType = {
    FixedLocation: t("polling_station.type.FixedLocation"),
    Special: t("polling_station.type.Special"),
    Mobile: t("polling_station.type.Mobile"),
  };
  //TODO: Table needs highlight option
  //TODO: Alert has some layout glitches
  return (
    <>
      <PageTitle title="Stembureaus - Abacus" />
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
      <main>
        {!data.polling_stations.length ? (
          <article>
            <h2>{t("polling_station.title.how_to_add")}</h2>
            <p className="mb-lg">{t("polling_station.message.no_polling_stations")}</p>

            <Toolbar>
              <Toolbar.Section pos="start">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconPlus />}
                  onClick={() => {
                    navigate("create");
                  }}
                >
                  {t("manual_input")}
                </Button>
              </Toolbar.Section>
            </Toolbar>
          </article>
        ) : (
          <article>
            <Toolbar>
              <Toolbar.Section pos="end">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<IconPlus />}
                  onClick={() => {
                    navigate("create");
                  }}
                >
                  {t("polling_station.form.create")}
                </Button>
              </Toolbar.Section>
            </Toolbar>

            <Table id="polling_stations">
              <Table.Header>
                <Table.Column>{t("number")}</Table.Column>
                <Table.Column>{t("name")}</Table.Column>
                <Table.Column>{t("type")}</Table.Column>
              </Table.Header>
              <Table.Body>
                {data.polling_stations.map((station) => (
                  <Table.LinkRow key={station.id} to={`update/${station.id}`}>
                    <Table.Cell number fontSizeClass="fs-body">
                      {station.number}
                    </Table.Cell>
                    <Table.Cell fontSizeClass="fs-md">{station.name}</Table.Cell>
                    <Table.Cell fontSizeClass="fs-md">
                      {labelForPollingStationType[station.polling_station_type]}
                    </Table.Cell>
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
