import { PageTitle } from "@/components/page_title/PageTitle";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { AbortDataEntryControl } from "@/features/data_entry/components/AbortDataEntryControl";
import { useDataEntryContext } from "@/features/data_entry/hooks/useDataEntryContext";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";

export function DataEntryHeader() {
  const { source, dataEntryStatus } = useDataEntryContext();
  const user = useUser();

  if (!user) {
    return null;
  }

  return (
    <>
      <PageTitle title={`${t("data_entry.title")} ${source.number} ${source.name} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{source.number}</PollingStationNumber>
          <h1>{source.name}</h1>
          <Badge type={dataEntryStatus} userRole={user.role} />
        </section>
        <section>
          <AbortDataEntryControl />
        </section>
      </header>
    </>
  );
}
