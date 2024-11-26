import candidates_votes from "./candidates_votes.json";
import check_and_save from "./check_and_save.json";
import differences from "./differences.json";
import election_report from "./election_report.json";
import election_status from "./election_status.json";
import error from "./error.json";
import feedback from "./feedback.json";
import generic from "./generic.json";
import polling_station from "./polling_station.json";
import polling_station_choice from "./polling_station_choice.json";
import recounted from "./recounted.json";
import status from "./status.json";
import user from "./user.json";
import voters_and_votes from "./voters_and_votes.json";

const nl = {
  ...generic,
  candidates_votes,
  check_and_save,
  differences,
  election_report,
  election_status,
  error,
  feedback,
  polling_station_choice,
  polling_station,
  recounted,
  status,
  user,
  voters_and_votes,
};

export default nl;
