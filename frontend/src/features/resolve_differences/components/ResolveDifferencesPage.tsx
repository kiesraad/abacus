import { Loader } from "@/components/ui/Loader/Loader";
import { useNumericParam } from "@/hooks/useNumericParam";

import { usePollingStationDataEntryDifferences } from "../hooks/usePollingStationDataEntryDifferences";
import { ResolveDifferencesTables } from "./ResolveDifferencesTables";

// TODO: Implement the actual page layout
export function ResolveDifferencesPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { election, loading, status } = usePollingStationDataEntryDifferences(pollingStationId);

  if (loading || status === null) {
    return <Loader />;
  }

  return (
    <ResolveDifferencesTables
      first={status.state.first_entry}
      second={status.state.second_entry}
      politicalGroups={election.political_groups}
    />
  );
}
