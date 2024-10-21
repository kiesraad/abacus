import { Link, Outlet } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { useElection } from "@kiesraad/api";

export function PollingStationsLayout() {
  const { election } = useElection();

  return (
    <div className="app-layout">
      <NavBar>
        <Link to={`/elections/${election.id}#coordinator`}>{election.name}</Link>
      </NavBar>
      <Outlet />
    </div>
  );
}
