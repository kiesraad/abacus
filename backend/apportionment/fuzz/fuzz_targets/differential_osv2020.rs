#![no_main]

use std::{
    collections::BTreeSet,
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
};

use apportionment::{ApportionmentError, CandidateVotes, process};
use apportionment_fuzz::{FuzzedApportionmentInput, get_total_seats, init_tracing, run_with_log};
use libfuzzer_sys::fuzz_target;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct ApportionmentRequest {
    seats: i64,
    pg_candidates: Vec<i64>,
    votes: Vec<i64>,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum ApportionmentResponse {
    Seats {
        seats: Vec<u32>,
        log: Vec<String>,
    },
    Conflict {
        #[allow(dead_code)]
        conflict: bool,
        log: Vec<String>,
    },
}

struct Osv2020WrapperProcess {
    stdin: std::process::ChildStdin,
    stdout: BufReader<std::process::ChildStdout>,
    _child: std::process::Child,
}

static OSV2020_WRAPPER: OnceLock<Mutex<Osv2020WrapperProcess>> = OnceLock::new();

#[derive(Debug)]
enum Osv2020Result {
    Allocated(Vec<u32>),
    Conflict,
}

fn osv2020_apportionment(
    seats: i64,
    pg_candidates: &[i64],
    votes: &[i64],
) -> (Osv2020Result, Vec<String>) {
    let proc = OSV2020_WRAPPER
        .get()
        .expect("OSV2020 wrapper process not started");
    let mut guard = proc.lock().unwrap();

    let req = ApportionmentRequest {
        seats,
        pg_candidates: pg_candidates.to_vec(),
        votes: votes.to_vec(),
    };

    let mut line = serde_json::to_string(&req).unwrap();
    line.push('\n');
    guard.stdin.write_all(line.as_bytes()).unwrap();

    let mut response = String::new();
    guard.stdout.read_line(&mut response).unwrap();

    let resp: ApportionmentResponse = serde_json::from_str(&response).unwrap();
    match resp {
        ApportionmentResponse::Seats { seats, log } => (Osv2020Result::Allocated(seats), log),
        ApportionmentResponse::Conflict { log, .. } => (Osv2020Result::Conflict, log),
    }
}

/// Print diagnostic output for a mismatch between Abacus and OSV2020, then panic.
fn report_mismatch(
    data: &FuzzedApportionmentInput,
    abacus: &str,
    abacus_log: &str,
    osv2020: &str,
    osv2020_log: &[String],
    message: &str,
) -> ! {
    eprintln!("\n=== Abacus ===");
    eprintln!("{abacus}");
    for line in abacus_log.lines() {
        eprintln!("[abacus] {line}");
    }
    eprintln!("\n=== OSV2020 ===");
    eprintln!("{osv2020}");
    for line in osv2020_log {
        eprintln!("[osv2020] {line}");
    }
    eprintln!("\n=== Conclusion ===");
    eprintln!("{message}");
    eprintln!("=== Input ===");
    eprintln!("{:#?}", data);
    panic!("{message}");
}

/// Parse a bracketed list of numbers (e.g. `[1, 2, 3]`) that follows `prefix`.
/// Returns None when the prefix or no valid list is not found.
fn parse_last_bracketed_list_numbers(log: &str, prefix: &str) -> Option<BTreeSet<u32>> {
    let line = log.lines().rev().find(|l| l.contains(prefix))?;
    let start = line.find(prefix)? + prefix.len();
    let lists = &line[start..line[start..].find(']')? + start];
    lists
        .split(',')
        .map(|s| s.trim().parse::<u32>())
        .collect::<Result<BTreeSet<u32>, _>>()
        .ok()
}

/// Parse the list numbers from Abacus's
/// "Drawing of lots is required for lists: [..]" log line.
/// Returns None when there is no drawing of lots for lists.
fn parse_abacus_lots_options(abacus_log: &str) -> Option<BTreeSet<u32>> {
    parse_last_bracketed_list_numbers(abacus_log, "Drawing of lots is required for lists: [")
}

/// Parse the list numbers from OSV2020's
/// "... Alternativen: List2, List3." log line
/// Returns None when there is no drawing of lots for lists.
fn parse_osv2020_lots_options(osv2020_log: &[String]) -> Option<BTreeSet<u32>> {
    let prefix = "Alternativen: ";
    let line = osv2020_log.iter().rev().find(|l| l.contains(prefix))?;
    let start = line.find(prefix)? + prefix.len();
    let lists = line[start..]
        .trim()
        .strip_suffix('.')
        .unwrap_or(line[start..].trim());
    lists
        .split(", ")
        .map(|name| {
            name.strip_prefix("List")
                .and_then(|n| n.parse::<u32>().ok())
        })
        .collect::<Option<BTreeSet<u32>>>()
}

/// Whether Abacus hit Article P 10 (list exhaustion) during seat assignment.
fn abacus_applied_list_exhaustion(abacus_log: &str) -> bool {
    abacus_log.contains("Exhausted lists in accordance with Article P 10 Kieswet")
}

fn init() {
    let osv2020_wrapper_bin = std::env::var("OSV2020_WRAPPER_BIN")
        .expect("OSV2020_WRAPPER_BIN environment variable must point to the apportionment-wrapper launcher script");

    let mut child = Command::new(&osv2020_wrapper_bin)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .unwrap_or_else(|e| {
            panic!("Failed to spawn OSV2020 wrapper process at {osv2020_wrapper_bin}: {e}")
        });

    let stdin = child.stdin.take().unwrap();
    let stdout = BufReader::new(child.stdout.take().unwrap());

    OSV2020_WRAPPER
        .set(Mutex::new(Osv2020WrapperProcess {
            stdin,
            stdout,
            _child: child,
        }))
        .ok();

    init_tracing();
}

fn fuzz(data: FuzzedApportionmentInput) {
    // Convert current data structure to OSV2020 wrapper format
    let pg_candidates: Vec<i64> = data
        .list_votes
        .iter()
        .map(|x| x.candidate_votes.len() as i64)
        .collect();

    let votes: Vec<i64> = data
        .list_votes
        .iter()
        .flat_map(|list| list.candidate_votes.iter())
        .map(|cv| cv.votes() as i64)
        .collect();

    let (osv2020_result, osv2020_log) =
        osv2020_apportionment(data.seats.into(), &pg_candidates, &votes);

    let (abacus_result, abacus_log) = run_with_log(|| process(&data));

    // Skip cases where there are fewer than 19 seats and both art. P 9 (absolute majority) and art. P 10 (list exhaustion) are applied.
    // Reason is that Abacus does not include the P 9-seat for the max. one seat requirement when assiging residual seats.
    // related issue: #3219
    if data.seats < 19
        && osv2020_log
            .iter()
            .any(|line| line.contains("Absolute Mehrheit"))
        && osv2020_log
            .iter()
            .any(|line| line.contains("Erschöpfte Listen"))
        && abacus_log.contains("in accordance with Article P 9 Kieswet")
        && abacus_log.contains("assigned to another list in accordance with Article P 10 Kieswet")
    {
        return;
    }

    match abacus_result {
        Ok(ref output) => {
            let abacus_seats = get_total_seats(&output.seat_assignment);

            match osv2020_result {
                Osv2020Result::Allocated(osv2020_seats) => {
                    if abacus_seats != osv2020_seats {
                        report_mismatch(
                            &data,
                            &format!("seats: {:?}\n{:#?}", abacus_seats, output.seat_assignment),
                            &abacus_log,
                            &format!("seats: {:?}", osv2020_seats),
                            &osv2020_log,
                            "seat allocation mismatch",
                        );
                    }
                }
                Osv2020Result::Conflict => {
                    // OSV2020 can require a drawing lots (P 7) for a residual seat while
                    // Abacus assigns it directly.
                    // 
                    // This is because OSV2020 does not enforce list exhaustion (P 10) during
                    // its residual seat assignment, it only retracts seats after assigning.
                    // Abacus will not assign a residual seat to a list that is already
                    // exhausted, so it never sees the same drawing lots.
                    //
                    // Related issues: #3214, #3219
                    let osv_p7_conflict = osv2020_log
                        .last()
                        .is_some_and(|l| l.contains("Conflict: Auslosung bezüglich P7."));
                    if osv_p7_conflict && abacus_applied_list_exhaustion(&abacus_log) {
                        // accept, do nothing
                    } else {
                        report_mismatch(
                            &data,
                            &format!("seats: {:?}\n{:#?}", abacus_seats, output.seat_assignment),
                            &abacus_log,
                            "conflict",
                            &osv2020_log,
                            "OSV2020 has conflict where Abacus has allocation",
                        );
                    }
                }
            }
        }
        Err(e @ ApportionmentError::DrawingOfLotsNotImplemented) => {
            match osv2020_result {
                Osv2020Result::Allocated(osv2020_seats) => {
                    report_mismatch(
                        &data,
                        &format!("Err({e:?})"),
                        &abacus_log,
                        &format!("seats: {:?}", osv2020_seats),
                        &osv2020_log,
                        &format!("OSV2020 has allocation where Abacus has {e:?}"),
                    );
                }
                Osv2020Result::Conflict => {
                    // OSV2020 assigns residual seats to exhausted lists via drawing of lots,
                    // so accept if Abacus also applied list exhaustion.
                    // 
                    // Related issues: #3214, #3367
                    if abacus_applied_list_exhaustion(&abacus_log) {
                        // accept, do nothing
                    } else {
                        // No exhaustion: the options for drawing lots must match.
                        let abacus_options = parse_abacus_lots_options(&abacus_log);
                        let osv2020_options = parse_osv2020_lots_options(&osv2020_log);
                        if abacus_options != osv2020_options {
                            report_mismatch(
                                &data,
                                &format!(
                                    "Err({e:?}) Abacus lots options: {abacus_options:?}"
                                ),
                                &abacus_log,
                                &format!("OSV2020 lots options: {osv2020_options:?}"),
                                &osv2020_log,
                                "OSV2020 and Abacus require drawing lots, but the options do not match",
                            );
                        }
                    }
                }
            }
        }
    }
}

fuzz_target!(
    init: {
        init()
    },
    |data: FuzzedApportionmentInput| {
        fuzz(data)
    }
);
