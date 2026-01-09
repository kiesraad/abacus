use std::process::{Command, ExitStatus};

fn main() {
    #[cfg(any(feature = "memory-serve", feature = "storybook"))]
    {
        let sources = vec![
            #[cfg(feature = "memory-serve")]
            ("frontend", "../frontend/dist"),
            #[cfg(feature = "storybook")]
            ("storybook", "../frontend/dist-storybook"),
        ];
        memory_serve::load_names_directories(sources, true);
    }

    // check if the repository is dirty (if there is any)
    let is_dirty = if let Ok((_, status)) =
        run_command("git", &["diff-index", "--quiet", "HEAD", "--"], false)
    {
        !status.success()
    } else {
        false
    };
    let dirty_postfix = if is_dirty { "-dirty" } else { "" };

    // determine the git commit (if there is any)
    let git_rev_raw = run_command_out("git", &["rev-parse", "HEAD"], true).ok();
    let git_rev = git_rev_raw
        .as_deref()
        .map(|rev| format!("{rev}{dirty_postfix}"));

    // determine if there is a tag for this commit (if we found a commit previously)
    let git_version = if let Some(git_rev_raw) = &git_rev_raw {
        run_command_out(
            "git",
            &[
                "describe",
                "--tags",
                "--exact-match",
                "--abbrev=0",
                "--match",
                "v*",
                git_rev_raw,
            ],
            true,
        )
        .ok()
        .map(|tag| tag.trim_start_matches('v').to_owned())
    } else {
        None
    };

    // fallback to short commit hash if no tag found
    let git_version = git_version.unwrap_or_else(|| {
        git_rev
            .as_deref()
            .map(|rev| format!("dev-{}", &rev[..7]))
            .unwrap_or_else(|| "-".to_owned())
    });
    let git_version = format!("{git_version}{dirty_postfix}");

    // output
    println!(
        "cargo:rustc-env=ABACUS_GIT_REV={}",
        git_rev.unwrap_or("-".to_owned())
    );
    println!("cargo:rustc-env=ABACUS_GIT_VERSION={}", git_version);
}

fn run_command(
    cmd: &str,
    args: &[&str],
    err_on_fail: bool,
) -> std::io::Result<(String, ExitStatus)> {
    let res = Command::new(cmd).args(args).output()?;
    match String::from_utf8(res.stdout) {
        Ok(data) => {
            let trimmed = data.trim().to_owned();
            if err_on_fail && !res.status.success() {
                Err(std::io::Error::other(format!(
                    "Command '{}' failed with error code: {}",
                    cmd,
                    res.status.code().unwrap_or(-1)
                )))
            } else {
                Ok((trimmed, res.status))
            }
        }
        Err(e) => Err(std::io::Error::new(std::io::ErrorKind::InvalidData, e)),
    }
}

fn run_command_out(cmd: &str, args: &[&str], err_on_fail: bool) -> std::io::Result<String> {
    run_command(cmd, args, err_on_fail).map(|(out, _)| out)
}
