use std::env;
use std::fs;
use std::io::Read;
use std::process;

use backend::create_openapi;

fn main() {
    let openapi = create_openapi();
    let doc = openapi
        .to_pretty_json()
        .expect("Could not generate OpenAPI JSON");

    if env::args().any(|arg| arg == "--check") {
        let mut current_doc = String::new();
        fs::File::open("./openapi.json")
            .expect("Could not open openapi.json")
            .read_to_string(&mut current_doc)
            .expect("Could not read openapi.json");

        if doc == current_doc {
            println!("openapi.json is up to date");
        } else {
            println!("openapi.json is not up to date");
            process::exit(1);
        }
    } else {
        fs::write("./openapi.json", doc).expect("Could not write openapi.json");
        println!("Updated openapi.json");
    }
}
