import { useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { type AnyApiError, ApiError } from "@/api/ApiResult";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Alert } from "@/components/ui/Alert/Alert";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUser } from "@/hooks/user/useUser.ts";
import { t } from "@/i18n/translate";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";
import { useDataEntryErrors } from "../hooks/useDataEntryErrors";
import { DetailNavigation } from "./DetailNavigation";
import { ReadOnlyDataEntryDelete } from "./delete/ReadOnlyDataEntryDelete";

export function DetailLayout() {
  const navigate = useNavigate();
  const { pushMessage } = useMessages();
  const dataEntryId = useNumericParam("dataEntryId");
  const { election } = useElection();
  const { loading, dataEntry } = useDataEntryErrors(dataEntryId);
  const [error, setError] = useState<AnyApiError>();
  const user = useUser();

  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  if (loading || !dataEntry || !user) {
    return null;
  }

  const structure = getDataEntryStructure(dataEntry.data.model, election);

  function handleDeleted() {
    pushMessage({
      title: t("data_entry_detail.data_entry_deleted"),
      text: t("data_entry_detail.data_entry_deleted_details", { nr: dataEntry?.source.number ?? "-" }),
    });

    void navigate(`/elections/${election.id}/status`, { replace: true });
  }

  return (
    <>
      {error && (
        <FormLayout.Alert>
          <Alert type="error">
            <p>{t(`error.api_error.${error.reference}`)}</p>
          </Alert>
        </FormLayout.Alert>
      )}

      <PageTitle
        title={`${t(`data_entry_detail.${dataEntry.status === "first_entry_has_errors" ? "resolve_errors.page_title" : "read_only.page_title"}`)} - Abacus`}
      />

      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{dataEntry.source.number}</PollingStationNumber>
          <h1>{dataEntry.source.name}</h1>
          <Badge type={dataEntry.status} userRole={user.role} />
        </section>
        {dataEntry.status !== "first_entry_has_errors" && (
          <section>
            <ReadOnlyDataEntryDelete
              dataEntrySource={dataEntry.source}
              dataEntryId={dataEntryId}
              status={dataEntry.status}
              onDeleted={handleDeleted}
              onError={setError}
            />
          </section>
        )}
      </header>
      <Messages />
      <main>
        <StickyNav>
          <DetailNavigation
            structure={structure}
            status={dataEntry.status}
            validationResults={dataEntry.validation_results}
          />
        </StickyNav>
        <article>
          <Outlet />
        </article>
      </main>
    </>
  );
}
