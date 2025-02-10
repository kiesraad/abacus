import { Link, NavLink } from "react-router";

import { Election, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconChevronRight } from "@kiesraad/icon";

import { NavBarMenuButton } from "./NavBarMenu";

type NavBarLinksProps = { location: { pathname: string; hash: string } };

function ElectionBreadcrumb({ election }: { election: Election }) {
  return (
    <>
      <span className="bold">{election.location}</span>
      <span>&mdash;</span>
      <span>{election.name}</span>
    </>
  );
}

function DataEntryLinks({ location }: NavBarLinksProps) {
  const { election } = useElection();

  return (
    <>
      <Link to={"/elections"}>{t("election.title.plural")}</Link>
      <IconChevronRight />
      {location.pathname.includes("/data-entry/") ? (
        // Within the data entry, link back to the polling station choice page
        <Link to={`/elections/${election.id}/data-entry`}>
          <ElectionBreadcrumb election={election} />
        </Link>
      ) : (
        // On the polling station choice page, display the election breadcrumb without linking
        <span>
          <ElectionBreadcrumb election={election} />
        </span>
      )}
    </>
  );
}

function ElectionManagementLinks({ location }: NavBarLinksProps) {
  const { election } = useElection();

  if (location.pathname.match(/^\/elections\/\d+\/?$/)) {
    return <></>;
  } else {
    return (
      <>
        <NavBarMenuButton />
        <Link to={`/elections/${election.id}#administratorcoordinator`}>
          <ElectionBreadcrumb election={election} />
        </Link>
        {location.pathname.match(/^\/elections\/\d+\/polling-stations\/(create|\d+\/update)$/) && (
          <>
            <IconChevronRight />
            <Link to={`/elections/${election.id}/polling-stations`}>{t("polling_stations")}</Link>
          </>
        )}
      </>
    );
  }
}

function TopLevelManagementLinks() {
  return (
    <>
      <NavLink to={"/elections#administrator"}>{t("election.title.plural")}</NavLink>
      <NavLink to={"/users#administratorcoordinator"}>{t("users")}</NavLink>
      <NavLink to={"/workstations#administrator"}>{t("workstations.workstations")}</NavLink>
      <NavLink to={"/logs#administratorcoordinator"}>{t("logs")}</NavLink>
    </>
  );
}

export function NavBarLinks({ location }: NavBarLinksProps) {
  const isAdministrator = location.hash.includes("administrator");
  const isCoordinator = location.hash.includes("coordinator");

  if (
    (location.pathname.match(/^\/elections(\/\d+)?$/) && (isAdministrator || isCoordinator)) ||
    location.pathname === "/users" ||
    location.pathname === "/workstations" ||
    location.pathname === "/logs"
  ) {
    return <TopLevelManagementLinks />;
  } else if (location.pathname.match(/^\/elections\/\d+\/data-entry/)) {
    return <DataEntryLinks location={location} />;
  } else if (location.pathname.match(/^\/elections\/\d+/)) {
    return <ElectionManagementLinks location={location} />;
  } else {
    return <></>;
  }
}
