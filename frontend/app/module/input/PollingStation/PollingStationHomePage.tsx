import { Link } from "react-router-dom";

export function PollingStationHomePage() {
  return (
    <span>
      Klik <Link to={"./recounted"}>hier</Link> om met de invoer te beginnen.
    </span>
  );
}
