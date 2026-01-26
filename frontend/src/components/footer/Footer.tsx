import { Link } from "react-router";
import { t } from "@/i18n/translate";

export function Footer({ showPrivacyStatementLink = true }: { showPrivacyStatementLink?: boolean }) {
  const gitBranch = __GIT_BRANCH__;
  let gitBranchShort = __GIT_BRANCH__;
  if (gitBranch && gitBranch.length > 32) {
    gitBranchShort = `${gitBranch.substring(0, 32)}…`;
  }
  const gitCommit = __GIT_COMMIT__;
  const gitVersion = __GIT_VERSION__ ?? (gitCommit ? `dev-${gitCommit.substring(0, 7)}` : "-");

  return (
    <footer>
      <section>
        <span className="mr-sm">
          Kiesraad - Abacus ({t("version")} {gitVersion})
        </span>
        {showPrivacyStatementLink && (
          <Link to={"/privacy-statement"} className="privacy_statement">
            {t("privacy_statement.title").toLowerCase()}
          </Link>
        )}
      </section>
      {__SHOW_DEV_PAGE__ && (
        <section>
          <span className="mr-sm">
            <strong>{t("server")}</strong> {__API_MSW__ ? "Mock Service Worker" : "Live"}
          </span>
          {gitBranch && (
            <>
              <strong>Branch</strong>{" "}
              <a href={`https://github.com/kiesraad/abacus/tree/${gitBranch}`} target="_blank">
                {gitBranchShort}
              </a>
              &nbsp;&nbsp;{" "}
            </>
          )}
          {gitCommit && (
            <>
              <strong>Commit</strong>{" "}
              {__GIT_DIRTY__ ? (
                <>{gitCommit}-dirty</>
              ) : (
                <a href={`https://github.com/kiesraad/abacus/commit/${gitCommit}`} target="_blank">
                  {gitCommit}
                </a>
              )}
            </>
          )}
        </section>
      )}
    </footer>
  );
}
