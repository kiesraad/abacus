use crate::{
    domain::{
        committee_session_status::CommitteeSessionStatus,
        election::{
            Candidate, CandidateGender, CandidateNumber, CommitteeCategory, ElectionCategory,
            PGNumber, RegisteredPoliticalGroup, VoteCountingMethod,
        },
    },
    fixtures::builders::election::ElectionBuilder,
};

pub fn election_6_no_polling_stations(b: ElectionBuilder) -> ElectionBuilder {
    let political_group = |number: u32, name: &str| RegisteredPoliticalGroup {
        number: PGNumber::from(number),
        registered_name: name.to_string(),
        candidates: vec![
            Candidate {
                number: CandidateNumber::from(1),
                initials: "A.".to_string(),
                first_name: Some("Alice".to_string()),
                last_name_prefix: None,
                last_name: "Foo".to_string(),
                locality: "Klein Dorp".to_string(),
                country_code: None,
                gender: Some(CandidateGender::Female),
            },
            Candidate {
                number: CandidateNumber::from(2),
                initials: "C.".to_string(),
                first_name: Some("Charlie".to_string()),
                last_name_prefix: None,
                last_name: "Doe".to_string(),
                locality: "Klein Dorp".to_string(),
                country_code: None,
                gender: None,
            },
        ],
    };

    #[expect(deprecated)]
    b.override_id(6)
        .name("Gemeenteraad Klein Dorp 2024")
        .committee_category(CommitteeCategory::GSB)
        .counting_method(VoteCountingMethod::CSO)
        .election_category(ElectionCategory::Municipal)
        .number_of_seats(29)
        // .election_id("GR2024_KleinDorp")
        // .location("Klein Dorp")
        // .authority_id("0123")
        // .authority_name("Klein Dorp")
        // .authority_region("Klein Dorp")
        // .domain(Some(ElectionDomain {
        //     id: Some("0123".to_string()),
        //     name: "Klein Dorp".to_string(),
        // }))
        // .number_of_voters(2500)
        // .election_date(NaiveDate::from_ymd_opt(2024, 12, 31).unwrap())
        // .nomination_date(NaiveDate::from_ymd_opt(2024, 12, 1).unwrap())
        .political_groups(vec![
            political_group(1, "Political Group A"),
            political_group(2, "Political Group B"),
        ])
        .committee_session(|b| b.override_id(7).status(CommitteeSessionStatus::Created))
}
