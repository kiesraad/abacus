use crate::{
    domain::{
        committee_session_status::CommitteeSessionStatus,
        data_entry::DataEntryStatusName,
        election::{
            Candidate,
            CandidateGender::{self, *},
            CandidateNumber, CommitteeCategory, ElectionCategory, PGNumber,
            RegisteredPoliticalGroup,
        },
        results::Results,
    },
    fixtures::builders::election::ElectionBuilder,
};

/// (initials, first_name, last_name_prefix, last_name, gender); "" means none.
type CandidateDefinition = (
    &'static str,
    &'static str,
    &'static str,
    &'static str,
    CandidateGender,
);

fn political_group(
    number: u32,
    name: &str,
    candidates: &[CandidateDefinition],
) -> RegisteredPoliticalGroup {
    let opt = |s: &str| (!s.is_empty()).then(|| s.to_string());
    RegisteredPoliticalGroup {
        number: PGNumber::from(number),
        registered_name: name.to_string(),
        candidates: candidates
            .iter()
            .zip(1..)
            .map(
                |(&(initials, first_name, prefix, last_name, gender), n)| Candidate {
                    number: CandidateNumber::from(n),
                    initials: initials.to_string(),
                    first_name: opt(first_name),
                    last_name_prefix: opt(prefix),
                    last_name: last_name.to_string(),
                    locality: "Juinen".to_string(),
                    country_code: None,
                    gender: Some(gender),
                },
            )
            .collect(),
    }
}

/// CSB election for GSB election_5_with_results
#[expect(deprecated, clippy::too_many_lines)]
pub fn election_8_csb_with_results(b: ElectionBuilder) -> ElectionBuilder {
    let mut groups = vec![
        political_group(
            1,
            "Political Group A",
            &[
                ("L.", "Lidewij", "", "Oud", Female),
                ("J.", "Johan", "", "Oud", Male),
                ("M.", "Marijke", "", "Oud", Female),
                ("A.", "Arie", "", "Jansen", Male),
                ("H.", "Henk", "van der", "Weijden", Male),
                ("B.", "Berta", "van der", "Weijden", Female),
                ("K.", "Klaas", "", "Oud", Male),
                ("S.", "Sophie", "", "Bakker", Female),
                ("J.", "Johan", "de", "Vries", Male),
                ("M.", "Marijke", "van den", "Berg", Female),
                ("R.", "Rolf", "de", "Jong", Male),
                ("K.", "Karin", "", "Kok", Female),
                ("G.", "Gert", "", "Smit", Male),
                ("E.", "Eva", "", "Koster", Female),
                ("L.", "Leon", "", "Hofman", Male),
                ("S.", "Sophie", "", "Visser", Female),
                ("D.", "Dirk", "", "Bakker", Male),
                ("P.", "Piet", "", "Jansen", Male),
                ("A.", "Annelies", "van", "Loon", Female),
                ("T.J.", "Tessa", "", "Jansen", Female),
                ("H.J.", "Hans", "", "Jansen", Male),
                ("W.J.", "Willem", "", "Janssen", Male),
                ("B.", "Bert", "", "Meyer", Male),
                ("M.M.", "Mieke", "", "Meyer", Female),
                ("J.V.", "Jan", "van", "Dijk", Male),
                ("S.D.", "Suzan", "de", "Wit", Female),
                ("K.V.", "Koen", "van der", "Meer", Male),
                ("L.S.", "Laura", "", "Smit", Female),
                ("F.K.", "Frank", "", "Kool", Male),
                ("C.R.", "Claudia", "", "Reinders", Female),
            ],
        ),
        political_group(
            2,
            "Political Group B",
            &[
                ("T.", "Tinus", "", "Bakker", Male),
                ("D.", "", "", "Po", X),
                ("W.", "Willem", "de", "Vries", Male),
                ("K.", "Klaas", "", "Kloosterboer", Male),
                ("L.", "Liesbeth", "", "Jansen", Female),
                ("H.", "Henk", "van den", "Berg", Male),
            ],
        ),
        political_group(
            3,
            "Political Group C",
            &[
                ("A.", "Adelbert", "van", "Doorn", Male),
                ("M.", "Margriet", "van der", "Linden", Female),
                ("P.", "Paul", "", "Veldkamp", Male),
                ("S.", "Sophie", "de", "Groot", Female),
                ("R.", "Rik", "de", "Ruiter", Male),
                ("N.", "Nico", "", "Ruiter", Male),
            ],
        ),
        political_group(
            4,
            "Political Group D",
            &[
                ("G.", "Gerard", "", "Bogaert", Male),
                ("J.", "Jan", "", "Stevens", Male),
                ("E.", "Els", "", "Groot", Female),
                ("B.", "Bart", "", "Smit", Male),
                ("F.", "Frits", "", "Veldman", Male),
            ],
        ),
        political_group(
            5,
            "",
            &[
                ("G.", "Gert", "", "Smit", Male),
                ("E.", "Eva", "", "Koster", Female),
                ("L.", "Leon", "", "Hofman", Male),
                ("S.", "Sophie", "", "Visser", Female),
            ],
        ),
    ];
    groups[1].candidates[0].country_code = Some("BE".to_string());

    let results: Results = serde_json::from_str(r#"{"model":"GSB","number_of_voters":15000,"voters_counts":{"poll_card_count":2406,"proxy_certificate_count":4,"total_admitted_voters_count":2410},"votes_counts":{"political_group_total_votes":[{"number":1,"total":1200},{"number":2,"total":604},{"number":3,"total":196},{"number":4,"total":198},{"number":5,"total":202}],"total_votes_candidates_count":2400,"blank_votes_count":6,"invalid_votes_count":4,"total_votes_cast_count":2410},"differences_counts":{"more_ballots_count":0,"fewer_ballots_count":0},"political_group_votes":[{"number":1,"total":1200,"candidate_votes":[{"number":1,"votes":156},{"number":2,"votes":40},{"number":3,"votes":110},{"number":4,"votes":90},{"number":5,"votes":100},{"number":6,"votes":0},{"number":7,"votes":120},{"number":8,"votes":80},{"number":9,"votes":60},{"number":10,"votes":40},{"number":11,"votes":100},{"number":12,"votes":0},{"number":13,"votes":0},{"number":14,"votes":0},{"number":15,"votes":0},{"number":16,"votes":0},{"number":17,"votes":0},{"number":18,"votes":0},{"number":19,"votes":0},{"number":20,"votes":0},{"number":21,"votes":0},{"number":22,"votes":0},{"number":23,"votes":0},{"number":24,"votes":0},{"number":25,"votes":0},{"number":26,"votes":0},{"number":27,"votes":0},{"number":28,"votes":0},{"number":29,"votes":0},{"number":30,"votes":304}]},{"number":2,"total":604,"candidate_votes":[{"number":1,"votes":300},{"number":2,"votes":100},{"number":3,"votes":44},{"number":4,"votes":20},{"number":5,"votes":60},{"number":6,"votes":80}]},{"number":3,"total":196,"candidate_votes":[{"number":1,"votes":40},{"number":2,"votes":30},{"number":3,"votes":50},{"number":4,"votes":6},{"number":5,"votes":4},{"number":6,"votes":66}]},{"number":4,"total":198,"candidate_votes":[{"number":1,"votes":40},{"number":2,"votes":30},{"number":3,"votes":50},{"number":4,"votes":48},{"number":5,"votes":30}]},{"number":5,"total":202,"candidate_votes":[{"number":1,"votes":40},{"number":2,"votes":62},{"number":3,"votes":20},{"number":4,"votes":80}]}]}"#).unwrap();

    b.override_id(8)
        .name("Gemeenteraad Juinen 2026 >= 19 seats")
        // .official_name("Gemeenteraad Juinen 2026")
        .committee_category(CommitteeCategory::CSB)
        .election_category(ElectionCategory::Municipal)
        .number_of_seats(23)
        // .election_id("GR2026_Juinen")
        // .location("Juinen")
        // .authority_id("CSB")
        // .authority_name("Juinen")
        // .authority_region("Juinen")
        // .domain(Some(ElectionDomain {
        //     id: Some("0035".to_string()),
        //     name: "Juinen".to_string(),
        // }))
        // .number_of_voters(1)
        // .election_date(NaiveDate::from_ymd_opt(2026, 3, 18).unwrap())
        // .nomination_date(NaiveDate::from_ymd_opt(2026, 2, 2).unwrap())
        .political_groups(groups)
        .committee_session(|b| {
            b.override_id(801)
                .status(CommitteeSessionStatus::DataEntry)
                .sub_committee(|b| {
                    b.override_id(811)
                        .number(35)
                        .name("Juinen")
                        .category(CommitteeCategory::GSB)
                        // .authority_id("0035")
                        // .authority_name("Juinen")
                        .data_entry(|b| {
                            b.state(DataEntryStatusName::Definitive)
                                .first_entry_user("typist3")
                                .second_entry_user("typist4")
                                .results(results)
                        })
                })
        })
}
