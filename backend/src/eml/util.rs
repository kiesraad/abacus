/// Utility that wraps a list of elements into a parent element.
///
/// This can be used to have a property `elements: Vec<Element>`, that is converted
/// to this xml:
///
/// ```xml
/// <Elements>
///     <Element>..</Element>
///     <!-- ... -->
///     <Element>..</Element>
/// </Elements>
/// ```
///
/// This can be done with this example code:
///
/// ```
/// mod example {
///     # use abacus::gen_wrap_list;
///     #[derive(serde::Deserialize, serde::Serialize)]
///     pub struct Element {}
///
///     #[derive(serde::Deserialize, serde::Serialize)]
///     pub struct Example {
///         #[serde(with = "test_serde")]
///         elements: Vec<Element>,
///     }
///
///     gen_wrap_list!(test_serde, Element, "Element");
/// }
/// ```
#[macro_export]
macro_rules! gen_wrap_list {
    ($modname:ident, $typename:ident, $xml_name:literal) => {
        $crate::gen_wrap_list!($modname, $typename, $xml_name, $xml_name);
    };
    ($modname:ident, $typename:ident, $serialize:literal, $deserialize:literal) => {
        mod $modname {
            use super::$typename;

            pub fn serialize<S>(value: &[$typename], serializer: S) -> Result<S::Ok, S::Error>
            where
                S: serde::Serializer,
            {
                use serde::Serialize;

                #[derive(serde::Serialize)]
                pub struct Values<'a> {
                    #[serde(rename(serialize = $serialize))]
                    pub values: &'a [$typename],
                }

                Values { values: &value[..] }.serialize(serializer)
            }

            pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<$typename>, D::Error>
            where
                D: serde::Deserializer<'de>,
            {
                use serde::Deserialize;

                #[derive(serde::Deserialize)]
                pub struct Values {
                    #[serde(rename(deserialize = $deserialize))]
                    pub values: Vec<$typename>,
                }

                Values::deserialize(deserializer).map(|inner| inner.values)
            }
        }
    };
}

pub(crate) use gen_wrap_list;
