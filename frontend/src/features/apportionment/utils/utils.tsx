import type { NavigateFunction } from "react-router";
import { PageTitle } from "@/components/page_title/PageTitle";
import { t } from "@/i18n/translate";
import type { ApportionmentState } from "@/types/generated/openapi";

export function renderTitleAndHeader(sectionTitle: string) {
  return (
    <>
      <PageTitle title={`${t("apportionment.title")} - Abacus`} />
      <header>
        <section>
          <h1>{sectionTitle}</h1>
        </section>
      </header>
    </>
  );
}

export function apportionmentCheckStateAndRedirect(
  state: ApportionmentState | undefined,
  electionId: number,
  navigate: NavigateFunction,
) {
  if (state?.type === "Uninitialised") {
    void navigate(`/elections/${electionId}/apportionment/include-all-candidates`);
  } else if (state?.type === "RegisteringDeceasedCandidates") {
    void navigate(`/elections/${electionId}/apportionment/deceased-candidates`);
  }
}
