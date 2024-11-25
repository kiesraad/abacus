import { Link, Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { useElection } from "@kiesraad/api";
import { AppLayout } from "@kiesraad/ui";

export function PollingStationsLayout() {
  const { election } = useElection();

  return (
    <AppLayout>
      <NavBar>
        <Link to={`/elections/${election.id}#coordinator`}>
          <span className="bold">{election.location}</span>
          <span>&mdash;</span>
          <span>{election.name}</span>
        </Link>
      </NavBar>
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
