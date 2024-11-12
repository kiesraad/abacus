import candidates_votes from "./candidates_votes.json";
import check_and_save from "./check_and_save.json";
import election_report from "./election_report.json";
import election_status from "./election_status.json";
import feedback from "./feedback.json";
import generic from "./generic.json";
import status from "./status.json";

const nl = {
  ...generic,
  status,
  candidates_votes,
  check_and_save,
  election_report,
  election_status,
  feedback,
};

export default nl;
