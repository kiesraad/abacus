import { Link } from "react-router-dom";

export function PollingStationHomePage() {
  return (
    <span id="begin">
      Klik{" "}
      <Link to={"./recounted"} id="begin-button">
        hier
      </Link>{" "}
      om met de invoer te beginnen.
    </span>
  );
}
