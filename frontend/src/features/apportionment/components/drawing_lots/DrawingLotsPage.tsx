import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type { ApportionmentState } from "@/types/generated/openapi";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { apportionmentCheckStateAndRedirect, renderTitleAndHeader } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";

function getPageTitle(state: ApportionmentState) {
  if (state.type === "DrawingLots") {
    if (state.drawing_lots_required.type === "ListDrawingLotsRequired") {
      if (state.drawing_lots_required.variant !== "AbsoluteMajority") {
        return t("apportionment.drawing_lots_for_seat", {
          number: state.drawing_lots_required.residual_seat_numbers[0] || "",
        });
      }
    }
  }
  return t("apportionment.drawing_lots");
}

export function DrawingLotsPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { error, state } = useApportionmentContext();

  useEffect(() => {
    apportionmentCheckStateAndRedirect(state, election.id, navigate);
    if (state?.type === "Finalised") {
      void navigate(`/elections/${election.id}/apportionment`);
    }
  });

  if (error) {
    return <ApportionmentErrorPage sectionTitle={t("apportionment.drawing_lots")} error={error} />;
  }

  if (state && state.type === "DrawingLots") {
    return (
      <>
        {renderTitleAndHeader(getPageTitle(state))}
        <main>
          <article className={cls.article}></article>
        </main>
      </>
    );
  }
}
