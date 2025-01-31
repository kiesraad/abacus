import { Link } from "react-router";

import { Election, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconChevronRight } from "@kiesraad/icon";

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

  // TODO: Add left side menu, #920

  if (location.pathname.match(/^\/elections\/\d+\/?$/)) {
    return (
      <span>
        <ElectionBreadcrumb election={election} />
      </span>
    );
  } else {
    return (
      <>
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

function TopLevelManagementLinks({ location }: NavBarLinksProps) {
  const links = [];
  if (location.pathname.startsWith("/elections")) {
    links.push(
      <span key="elections" className="active">
        {t("election.title.plural")}
      </span>,
    );
  } else {
    links.push(
      <Link key="elections-link" to={`/elections#administratorcoordinator`}>
        {t("election.title.plural")}
      </Link>,
    );
  }
  if (location.pathname.startsWith("/users")) {
    links.push(
      <span key="users" className="active">
        {t("users")}
      </span>,
    );
  } else {
    links.push(
      <Link key="users-link" to={`/users#administratorcoordinator`}>
        {t("users")}
      </Link>,
    );
  }
  if (location.pathname.startsWith("/workstations")) {
    links.push(
      <span key="workstations" className="active">
        {t("workstations.workstations")}
      </span>,
    );
  } else {
    links.push(
      <Link key="workstations-link" to={`/workstations#administrator`}>
        {t("workstations.workstations")}
      </Link>,
    );
  }
  if (location.pathname.startsWith("/logs")) {
    links.push(
      <span key="logs" className="active">
        {t("logs")}
      </span>,
    );
  } else {
    links.push(
      <Link key="logs-link" to={`/logs#administratorcoordinator`}>
        {t("logs")}
      </Link>,
    );
  }

  return <>{links}</>;
}

export function NavBarLinks({ location }: NavBarLinksProps) {
  const isAdministrator = location.hash.includes("administrator");
  const isCoordinator = location.hash.includes("coordinator");

  if (location.pathname.match(/^\/elections\/\d+\/data-entry/)) {
    return <DataEntryLinks location={location} />;
  } else if (location.pathname.match(/^\/elections\/\d+/)) {
    return <ElectionManagementLinks location={location} />;
  } else if (
    (location.pathname === "/elections" && (isAdministrator || isCoordinator)) ||
    location.pathname === "/users" ||
    location.pathname === "/workstations" ||
    location.pathname === "/logs"
  ) {
    return <TopLevelManagementLinks location={location} />;
  } else {
    return <></>;
  }
}
