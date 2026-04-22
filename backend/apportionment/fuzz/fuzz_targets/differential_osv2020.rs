#![no_main]

use std::{
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
};

use apportionment::{process, ApportionmentError, CandidateVotes};
use apportionment_fuzz::{get_total_seats, init_tracing, run_with_log, FuzzedApportionmentInput};
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
    eprintln!("=== Conclusion ===");
    eprintln!("{message}");
    eprintln!("=== Input ===");
    eprintln!("{:#?}", data);
    eprintln!("=== Abacus ===");
    eprintln!("{abacus}");
    for line in abacus_log.lines() {
        eprintln!("[abacus] {line}");
    }
    eprintln!("=== OSV2020 ===");
    eprintln!("{osv2020}");
    for line in osv2020_log {
        eprintln!("[osv2020] {line}");
    }
    panic!("{message}");
}

fuzz_target!(
    init: {
        let osv2020_wrapper_bin = std::env::var("OSV2020_WRAPPER_BIN")
            .expect("OSV2020_WRAPPER_BIN environment variable must point to the apportionment-wrapper launcher script");

        let mut child = Command::new(&osv2020_wrapper_bin)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap_or_else(|e| panic!("Failed to spawn OSV2020 wrapper process at {osv2020_wrapper_bin}: {e}"));

        let stdin = child.stdin.take().unwrap();
        let stdout = BufReader::new(child.stdout.take().unwrap());

        OSV2020_WRAPPER.set(Mutex::new(Osv2020WrapperProcess { stdin, stdout, _child: child })).ok();

        init_tracing();
    },
    |data: FuzzedApportionmentInput| {
        // Skip cases with zero total votes cast
        if data.list_votes.iter().map(|list| list.candidate_votes.iter().map(|cv| cv.votes()).sum::<u32>()).sum::<u32>() == 0 {
            return
        }
        // Skip cases where any party has zero total votes
        //if data.list_votes.iter().any(|list| list.candidate_votes.iter().map(|cv| cv.votes()).sum::<u32>() == 0) {
        //    return;
        //}

        // Convert current data structure to OSV2020 wrapper format
        let pg_candidates: Vec<i64> = data.list_votes.iter().map(|x| x.candidate_votes.len() as i64).collect();
        let votes: Vec<i64> = data.list_votes.iter()
            .flat_map(|list| list.candidate_votes.iter())
            .map(|cv| cv.votes() as i64)
            .collect();

        let (osv2020_result, osv2020_log) = osv2020_apportionment(data.seats.into(), &pg_candidates, &votes);

        let (abacus_result, abacus_log) = run_with_log(|| process(&data));

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
            Err(e @ (ApportionmentError::DrawingOfLotsNotImplemented
                   | ApportionmentError::AllListsExhausted
                   | ApportionmentError::ZeroVotesCast)) => {
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
                    Osv2020Result::Conflict => {} // both agree
                }
            }
        }
});
