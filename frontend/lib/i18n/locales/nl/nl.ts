import apportionment from "./apportionment.json";
import candidates_votes from "./candidates_votes.json";
import check_and_save from "./check_and_save.json";
import data_entry from "./data_entry.json";
import differences from "./differences.json";
import election from "./election.json";
import election_report from "./election_report.json";
import election_status from "./election_status.json";
import error from "./error.json";
import feedback from "./feedback.json";
import form_errors from "./form_errors.json";
import generic from "./generic.json";
import messages from "./messages.json";
import polling_station from "./polling_station.json";
import polling_station_choice from "./polling_station_choice.json";
import recounted from "./recounted.json";
import status from "./status.json";
import user from "./user.json";
import users from "./users.json";
import voters_and_votes from "./voters_and_votes.json";
import workstations from "./workstations.json";

const nl = {
  ...generic,
  apportionment,
  candidates_votes,
  check_and_save,
  data_entry,
  differences,
  election,
  election_report,
  election_status,
  error,
  feedback,
  form_errors,
  messages,
  polling_station,
  polling_station_choice,
  recounted,
  status,
  user,
  users,
  voters_and_votes,
  workstations,
};

export default nl;
