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
///     gen_wrap_list!(mod test_serde as element: Element => Elements);
/// }
/// ```
#[macro_export]
macro_rules! gen_wrap_list {
    (mod $modname:ident as $singular:ident: $typename:ident => $plural:ident) => {
        mod $modname {
            use super::$typename;

            pub fn serialize<S>(value: &[$typename], serializer: S) -> Result<S::Ok, S::Error>
            where
                S: serde::Serializer,
            {
                use serde::Serialize;

                #[derive(serde::Serialize)]
                #[serde(rename_all = "PascalCase")]
                pub struct $plural<'a> {
                    pub $singular: &'a [$typename],
                }

                $plural {
                    $singular: &value[..],
                }
                .serialize(serializer)
            }

            pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<$typename>, D::Error>
            where
                D: serde::Deserializer<'de>,
            {
                use serde::Deserialize;

                #[derive(serde::Deserialize)]
                #[serde(rename_all = "PascalCase")]
                pub struct $plural {
                    pub $singular: Vec<$typename>,
                }

                $plural::deserialize(deserializer).map(|inner| inner.$singular)
            }
        }
    };
}

pub(crate) use gen_wrap_list;
