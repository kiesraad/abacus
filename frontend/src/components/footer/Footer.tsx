import { t } from "@/i18n/translate";

export function Footer() {
  const gitBranch = __GIT_BRANCH__;
  let gitBranchShort = __GIT_BRANCH__;
  if (gitBranch && gitBranch.length > 32) {
    gitBranchShort = gitBranch.substring(0, 32) + "…";
  }
  const gitCommit = __GIT_COMMIT__;

  return (
    <footer>
      <section>Kiesraad - Abacus GR26 ({t("version")} 1.0.0)</section>
      {__SHOW_DEV_PAGE__ && (
        <section>
          <strong>{t("server")}</strong> {__API_MSW__ ? "Mock Service Worker" : "Live"} &nbsp;&nbsp;{" "}
          {gitBranch && (
            <>
              <strong>Branch</strong>{" "}
              <a href={"https://github.com/kiesraad/abacus/tree/" + gitBranch} target="_blank">
                {gitBranchShort}
              </a>
            </>
          )}
          {gitCommit && (
            <>
              <strong>Commit</strong>{" "}
              {__GIT_DIRTY__ ? (
                <>{gitCommit}-dirty</>
              ) : (
                <a href={"https://github.com/kiesraad/abacus/commit/" + gitCommit} target="_blank">
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
