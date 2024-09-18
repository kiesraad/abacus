export function Footer() {
  const gitBranch = __GIT_BRANCH__;
  let gitBranchShort = __GIT_BRANCH__;
  if (gitBranch && gitBranch.length > 32) {
    gitBranchShort = gitBranch.substring(0, 32) + "…";
  }
  const gitCommit = __GIT_COMMIT__;
  const gitDirty = __GIT_DIRTY__;
  let mode = (import.meta.env.MODE as string | undefined) || "unknown";
  mode = (mode[0]?.toUpperCase() ?? "") + mode.slice(1);

  return (
    <footer>
      <section>
        Abacus{" "}
        {gitBranch && (
          <>
            — <a href={"https://github.com/kiesraad/abacus/tree/" + gitBranch}>{gitBranchShort}</a>
          </>
        )}
      </section>
      <section>
        <strong>Server</strong> {__API_MSW__ ? "Mock Service Worker" : "Live"} &nbsp;&nbsp;
        <strong>Versie</strong>{" "}
        {gitCommit ? (
          gitDirty ? (
            <>{gitCommit}-dirty</>
          ) : (
            <a href={"https://github.com/kiesraad/abacus/commit/" + gitCommit}>{gitCommit}</a>
          )
        ) : (
          mode
        )}
      </section>
    </footer>
  );
}
