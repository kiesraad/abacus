import { useNavigate } from "react-router";
import { useElection } from "@/hooks/election/useElection";
import { useApportionmentContext } from "../../hooks/useApportionmentContext";

export function DeceasedCandidatesPage() {
  const navigate = useNavigate();
  const { election } = useElection();
  const { state } = useApportionmentContext();

  if (state.type === "Finalised") {
    void navigate(`/elections/${election.id}/apportionment`);
  }

  return null;
}
