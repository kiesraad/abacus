import { IconFilePlus, IconPlus } from "@/components/generated/icons";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Table } from "@/components/ui/Table/Table";
import { Toolbar } from "@/components/ui/Toolbar/Toolbar";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";

import { usePollingStationListRequest } from "../hooks/usePollingStationListRequest";

export function PollingStationListPage() {
  const { election } = useElection();
  const { requestState } = usePollingStationListRequest(election.id);

  if (requestState.status === "loading") {
    return <Loader />;
  }

  if ("error" in requestState) {
    throw requestState.error;
  }

  const data = requestState.data;

  const labelForPollingStationType = {
    FixedLocation: t("polling_station.type.FixedLocation"),
    Special: t("polling_station.type.Special"),
    Mobile: t("polling_station.type.Mobile"),
  };

  return (
    <>
      <PageTitle title={`${t("polling_station.manage")} - Abacus`} />
      <header>
        <section>
          <h1>{t("polling_station.manage")}</h1>
        </section>
      </header>

      <Messages />

      <main>
        {!data.polling_stations.length ? (
          <article>
            <h2>{t("polling_station.title.how_to_add")}</h2>
            <p className="mb-lg">{t("polling_station.message.no_polling_stations")}</p>

            <Toolbar>
              <Toolbar.Section>
                <Button.Link variant="primary" size="md" to="./import">
                  <IconFilePlus /> {t("import_from_file")}
                </Button.Link>
                <Button.Link variant="secondary" size="md" to="./create">
                  <IconPlus /> {t("manual_input")}
                </Button.Link>
              </Toolbar.Section>
            </Toolbar>
          </article>
        ) : (
          <article>
            <Toolbar>
              <Button.Link variant="secondary" size="sm" to="./create">
                <IconPlus /> {t("polling_station.create")}
              </Button.Link>
            </Toolbar>

            <Table id="polling_stations">
              <Table.Header>
                <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
                <Table.HeaderCell>{t("name")}</Table.HeaderCell>
                <Table.HeaderCell>{t("type")}</Table.HeaderCell>
              </Table.Header>
              <Table.Body className="fs-md">
                {data.polling_stations.map((station) => (
                  <Table.LinkRow key={station.id} to={`${station.id}/update`}>
                    <Table.NumberCell>{station.number}</Table.NumberCell>
                    <Table.Cell className="break-word">{station.name}</Table.Cell>
                    <Table.Cell>
                      {station.polling_station_type && labelForPollingStationType[station.polling_station_type]
                        ? labelForPollingStationType[station.polling_station_type]
                        : "–"}
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
