use abacus::eml::{
    EMLDocument,
    common::Candidate,
    eml_110::{PollingPlace, RegisteredParty},
};

const EML_110A_ITEM: &str = r#"
        <kr:RegisteredParty>
          <kr:RegisteredAppellation>De Democraten Onderzoeken Spam (DDOS)</kr:RegisteredAppellation>
        </kr:RegisteredParty>
"#;

const EML_110B_ITEM: &str = r#"
        <PollingPlace Channel="polling">
          <PhysicalLocation>
            <Address>
              <Locality>
                <xal:LocalityName>Test locatie</xal:LocalityName>
                <xal:PostalCode>
                  <xal:PostalCodeNumber>1234 AA</xal:PostalCodeNumber>
                </xal:PostalCode>
              </Locality>
            </Address>
            <PollingStation Id="1">0</PollingStation>
          </PhysicalLocation>
        </PollingPlace>
"#;

const EML_230B_ITEM: &str = r#"
          <Candidate>
            <CandidateIdentifier Id="1"/>
            <CandidateFullName>
              <xnl:PersonName>
                <xnl:NameLine NameType="Initials">A..</xnl:NameLine>
                <xnl:FirstName>Test</xnl:FirstName>
                <xnl:LastName>Candidate</xnl:LastName>
              </xnl:PersonName>
            </CandidateFullName>
            <Gender>female</Gender>
            <QualifyingAddress>
              <xal:Country>
                <xal:CountryNameCode>NL</xal:CountryNameCode>
                <xal:Locality>
                  <xal:LocalityName>Heemdamseburg</xal:LocalityName>
                </xal:Locality>
              </xal:Country>
            </QualifyingAddress>
          </Candidate>
"#;

fn main() {
    let eml110a = gen_eml_110a(5 * 1024 * 1024);
    let eml110b = gen_eml_110b(5 * 1024 * 1024);
    let eml230b = gen_eml_230b(5 * 1024 * 1024);
    std::fs::write("110a.eml.xml", eml110a).expect("Could not write EML");
    std::fs::write("110b.eml.xml", eml110b).expect("Could not write EML");
    std::fs::write("230b.eml.xml", eml230b).expect("Could not write EML");
}

fn gen_eml_110a(at_least_num_bytes: usize) -> String {
    let eml110a_str = include_str!("../eml/tests/eml110a_test.eml.xml");
    let mut eml110a = abacus::eml::EML110::from_str(eml110a_str).expect("Could not parse EML");
    let registered_party: RegisteredParty =
        quick_xml::de::from_str(EML_110A_ITEM).expect("Could not parse registered party");
    eml110a
        .election_event
        .election
        .registered_parties
        .resize(at_least_num_bytes / EML_110A_ITEM.len(), registered_party);
    eml110a.to_xml_string().expect("Could not serialize")
}

fn gen_eml_110b(at_least_num_bytes: usize) -> String {
    let eml110b_str = include_str!("../eml/tests/eml110b_test.eml.xml");
    let mut eml110b = abacus::eml::EML110::from_str(eml110b_str).expect("Could not parse EML");
    let polling_place: PollingPlace =
        quick_xml::de::from_str(EML_110B_ITEM).expect("Could not parse Polling Place");
    eml110b
        .election_event
        .election
        .contest
        .polling_places
        .resize(at_least_num_bytes / EML_110B_ITEM.len(), polling_place);
    eml110b.to_xml_string().expect("Could not serialize")
}

fn gen_eml_230b(at_least_num_bytes: usize) -> String {
    let eml230b_str = include_str!("../eml/tests/eml230b_test.eml.xml");
    let mut eml230b = abacus::eml::EML230::from_str(eml230b_str).expect("Could not parse EML");
    let candidate: Candidate =
        quick_xml::de::from_str(EML_230B_ITEM).expect("Could not parse candidate");
    eml230b
        .candidate_list
        .election
        .contest
        .affiliations
        .last_mut()
        .expect("No existing affiliation in test file")
        .candidates
        .resize(at_least_num_bytes / EML_230B_ITEM.len(), candidate);
    eml230b.to_xml_string().expect("Could not serialize")
}
