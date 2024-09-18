export function Footer() {
  const gitBranch = import.meta.env.GIT_BRANCH as string | undefined;
  let gitBranchShort = gitBranch;
  if (gitBranch && gitBranch.length > 32) {
    gitBranchShort = gitBranch.substring(0, 32) + "…";
  }
  const gitCommit = import.meta.env.GIT_COMMIT as string | undefined;
  const gitDirty = import.meta.env.GIT_DIRTY as boolean;
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
        <strong>Server</strong> {process.env.MSW ? "Mock Service Worker" : "Live"} &nbsp;&nbsp;
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
