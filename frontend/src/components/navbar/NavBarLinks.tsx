import { Link, NavLink } from "react-router";

import { IconChevronRight } from "@/components/generated/icons";
import { useElection } from "@/hooks/election/useElection";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";
import { Election } from "@/types/generated/openapi";
import { committeeSessionLabel } from "@/utils/committeeSession";

import { NavBarMenuButton } from "./NavBarMenu";

type NavBarLinksProps = { location: { pathname: string } };

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
  const { committeeSession, election } = useElection();

  if (location.pathname.match(/^\/elections\/\d+\/?$/)) {
    return <></>;
  }

  return (
    <>
      <NavBarMenuButton />
      <Link to={`/elections/${election.id}`}>
        <ElectionBreadcrumb election={election} />
      </Link>
      {location.pathname.match(/^\/elections\/\d+\/polling-stations\/(create|\d+\/update)$/) && (
        <>
          <IconChevronRight />
          <Link to={`/elections/${election.id}/polling-stations`}>{t("polling_stations")}</Link>
        </>
      )}
      {location.pathname.match(
        /^\/elections\/\d+\/apportionment\/(\d+|details-full-seats|details-residual-seats)$/,
      ) && (
        <>
          <IconChevronRight />
          <Link to={`/elections/${election.id}/apportionment`}>{t("apportionment.title")}</Link>
        </>
      )}
      {location.pathname.match(/^\/elections\/\d+\/status\/\d+\/(resolve-differences|resolve-errors)$/) && (
        <>
          <IconChevronRight />
          <Link to={`/elections/${election.id}/status`}>{committeeSessionLabel(committeeSession.number)}</Link>
        </>
      )}
    </>
  );
}

function TopLevelManagementLinks({ isAdministrator }: { isAdministrator: boolean }) {
  return (
    <>
      <NavLink to={"/elections"}>{t("election.title.plural")}</NavLink>
      {isAdministrator && (
        <>
          <NavLink to={"/users"}>{t("users.users")}</NavLink>
          <NavLink to={"/workstations"}>{t("workstations.workstations")}</NavLink>
        </>
      )}
      <NavLink to={"/logs"}>{t("logs")}</NavLink>
    </>
  );
}

export function NavBarLinks({ location }: NavBarLinksProps) {
  const { isAdministrator, isCoordinator } = useUserRole();

  if (
    (location.pathname.match(/^\/elections(\/\d+)?$/) && (isAdministrator || isCoordinator)) ||
    location.pathname.startsWith("/elections/create") ||
    location.pathname.startsWith("/users") ||
    location.pathname === "/workstations" ||
    location.pathname === "/logs"
  ) {
    return <TopLevelManagementLinks isAdministrator={isAdministrator} />;
  }

  if (location.pathname.match(/^\/elections\/\d+\/data-entry/)) {
    return <DataEntryLinks location={location} />;
  }

  if (location.pathname.match(/^\/elections\/\d+/)) {
    return <ElectionManagementLinks location={location} />;
  }

  return <></>;
}
