import { type ReactElement, useEffect } from "react";
import { useNavigate } from "react-router";

import { useElection } from "@/hooks/election/useElection";
import { tx } from "@/i18n/translate";

import { useApportionmentContext } from "../../hooks/useApportionmentContext";
import { apportionmentCheckStateAndRedirect, renderTitleAndHeader } from "../../utils/utils";
import cls from "../Apportionment.module.css";
import { ApportionmentErrorPage } from "../ApportionmentError";

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

  let pageTitle: ReactElement = <></>;
  if (state && state.type === "DrawingLots") {
    if (state.drawing_lots_required.type === "ListDrawingLotsRequired") {
      if (state.drawing_lots_required.variant !== "AbsoluteMajority") {
        pageTitle = tx("apportionment.drawing_lots_for_seat", undefined, {
          number: state.drawing_lots_required.residual_seat_numbers[0] || "",
        });
      }
    }

    if (error && error.reference === "ApportionmentCommitteeSessionNotCompleted") {
      return <ApportionmentErrorPage sectionTitle={pageTitle} error={error} />;
    }

    return (
      <>
        {renderTitleAndHeader(pageTitle)}
        <main>
          <article className={cls.article}></article>
        </main>
      </>
    );
  }
}
