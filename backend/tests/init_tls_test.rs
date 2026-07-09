#![cfg(feature = "tls")]

use std::process::Command;

#[test]
fn init_tls_creates_ca_and_exits_without_database() {
    let dir = tempfile::tempdir().unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_abacus"))
        .current_dir(dir.path())
        .args(["--init-tls", "--tls-dir", "tls"])
        .output()
        .expect("failed to run abacus --init-tls");

    assert!(
        output.status.success(),
        "expected exit 0, got {:?}\nstderr: {}",
        output.status.code(),
        String::from_utf8_lossy(&output.stderr),
    );

    assert!(
        dir.path().join("tls/ca.pem").exists(),
        "ca.pem should be created"
    );
    assert!(
        dir.path().join("tls/ca.cer").exists(),
        "ca.cer should be created"
    );

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("CA SHA-256 fingerprint:"),
        "stdout should include the fingerprint line, got:\n{stdout}"
    );

    assert!(
        !dir.path().join("db.sqlite").exists(),
        "--init-tls must not create a database"
    );
}
