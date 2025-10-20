mod api;

pub use api::router;

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
                <xnl:NameLine NameType="Initials">A.</xnl:NameLine>
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
