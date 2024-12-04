use std::io::BufRead;

use quick_xml::{
    se::{Serializer, WriteResult},
    DeError, SeError,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};

/// Base EML XML document that contains all the mostly irrelevant for our logic
/// XML tags and setup.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EMLBase {
    #[serde(rename = "@Id")]
    pub id: String,
    #[serde(rename = "@SchemaVersion")]
    pub schema_version: String,

    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@xmlns")]
    pub xmlns: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@xmlns:kr")]
    pub xmlns_kr: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "@xmlns:rg")]
    pub xmlns_rg: Option<String>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "@xmlns:xal"
    )]
    pub xmlns_xal: Option<String>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "@xmlns:xnl"
    )]
    pub xmlns_xnl: Option<String>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        rename = "@xmlns:xsi"
    )]
    pub xmlns_xsi: Option<String>,
}

impl EMLBase {
    pub fn new(id: &str) -> Self {
        EMLBase {
            id: id.into(),
            schema_version: "5".into(),
            xmlns: Some("urn:oasis:names:tc:evs:schema:eml".into()),
            xmlns_kr: Some("http://www.kiesraad.nl/extensions".into()),
            xmlns_rg: Some("http://www.kiesraad.nl/reportgenerator".into()),
            xmlns_xal: Some("urn:oasis:names:tc:ciq:xsdschema:xAL:2.0".into()),
            xmlns_xnl: Some("urn:oasis:names:tc:ciq:xsdschema:xNL:2.0".into()),
            xmlns_xsi: Some("http://www.w3.org/2001/XMLSchema-instance".into()),
        }
    }
}

pub trait EMLDocument: Sized + DeserializeOwned + Serialize {
    fn from_str(s: &str) -> Result<Self, DeError> {
        quick_xml::de::from_str(s)
    }

    fn from_reader(r: impl BufRead) -> Result<Self, DeError> {
        quick_xml::de::from_reader(r)
    }

    fn to_xml_string(&self) -> Result<String, SeError> {
        let mut buff = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        self.to_xml_with_writer(&mut buff)?;
        Ok(buff)
    }

    fn to_xml_with_writer(
        &self,
        writer: &mut impl std::fmt::Write,
    ) -> Result<WriteResult, SeError> {
        let serializer = {
            let mut s = Serializer::with_root(writer, Some("EML"))
                .expect("Constructing a new XML Serializer cannot fail");
            s.indent(' ', 4);
            s
        };
        Serialize::serialize(&self, serializer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Debug, Serialize, Deserialize)]
    struct EmptyDoc {
        #[serde(flatten)]
        base: EMLBase,
    }

    impl EMLDocument for EmptyDoc {}

    #[test]
    fn test_base_serialize() {
        let res = EmptyDoc {
            base: EMLBase::new("test-id"),
        }
        .to_xml_string()
        .unwrap();
        assert!(res.contains("test-id"));
        assert!(res.contains("xmlns=\""));
        assert!(res.contains("xmlns:kr=\""));
    }

    #[test]
    fn test_base_deserialize() {
        let doc = r#"<?xml version="1.0"?><EML Id="test-id" SchemaVersion="5"></EML>"#;
        let doc = EmptyDoc::from_str(doc).unwrap();
        assert_eq!(doc.base.xmlns, None);
        assert_eq!(doc.base.id, "test-id");
        assert_eq!(doc.base.schema_version, "5");
    }
}
