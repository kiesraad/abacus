import { t } from "@/i18n/translate";

export function Footer() {
  const gitBranch = __GIT_BRANCH__;
  let gitBranchShort = __GIT_BRANCH__;
  if (gitBranch && gitBranch.length > 32) {
    gitBranchShort = gitBranch.substring(0, 32) + "…";
  }
  const gitCommit = __GIT_COMMIT__;
  const gitDirty = __GIT_DIRTY__;

  return (
    <footer>
      <section>
        Abacus{" "}
        {gitBranch && (
          <>
            —{" "}
            <a href={"https://github.com/kiesraad/abacus/tree/" + gitBranch} target="_blank">
              {gitBranchShort}
            </a>
          </>
        )}
      </section>
      <section>
        <strong>{t("server")}</strong> {__API_MSW__ ? "Mock Service Worker" : "Live"} &nbsp;&nbsp;{" "}
        {gitCommit && (
          <>
            <strong>{t("version")}</strong>{" "}
            {gitDirty ? (
              <>{gitCommit}-dirty</>
            ) : (
              <a href={"https://github.com/kiesraad/abacus/commit/" + gitCommit} target="_blank">
                {gitCommit}
              </a>
            )}
          </>
        )}
      </section>
    </footer>
  );
}
