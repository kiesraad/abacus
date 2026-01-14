use serde::Serializer;
use serde::de::DeserializeOwned;
use serde::ser::Serialize;
use serde::{Deserialize, Deserializer};
use serde_json;
use serde_json::Value;
use std::collections::HashMap;

pub fn deserialize<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: DeserializeOwned,
{
    let value = Value::deserialize(deserializer)?;

    // Is the value a hashmap?
    let flat_map: HashMap<String, Value> = match value {
        Value::Object(map) => map.into_iter().collect(),
        _ => {
            use serde::de::Error;
            return Err(D::Error::custom("Expected JSON object"));
        }
    };

    // Convert flat map to nested structure
    let mut nested_value = Value::Object(serde_json::Map::new());
    for (key, value) in flat_map {
        let parts: Vec<&str> = key.split('.').collect();
        insert_value(&mut nested_value, &parts, value);
    }

    // Deserialize the nested structure into the target type
    serde_json::from_value(nested_value).map_err(serde::de::Error::custom)
}

pub fn serialize<T, S>(value: &T, serializer: S) -> Result<S::Ok, S::Error>
where
    T: Serialize,
    S: Serializer,
{
    // Serialize the value to a serde_json::Value
    let value = serde_json::to_value(value).map_err(serde::ser::Error::custom)?;

    // Flatten the structure
    let mut flat_map = serde_json::Map::new();
    flatten_recursive(&value, String::new(), &mut flat_map);

    // Serialize the flat map
    flat_map.serialize(serializer)
}

fn insert_value(target: &mut Value, path: &[&str], value: Value) {
    if path.is_empty() {
        *target = value;
        return;
    }

    // Get first part of the path
    let head: &str = path[0];

    // Assume we are dealing with an array if it can be parsed as usize
    if let Ok(index) = head.parse::<usize>() {
        // If target is not an array yet, make it
        if !target.is_array() {
            *target = Value::Array(Vec::new());
        }

        if let Some(arr) = target.as_array_mut() {
            // Ensure the array is large enough
            if arr.len() <= index {
                arr.resize(index + 1, Value::Null);
            }

            insert_value(&mut arr[index], &path[1..], value);
        }
    } else {
        // Object
        if !target.is_object() {
            *target = Value::Object(serde_json::Map::new());
        }

        if let Some(obj) = target.as_object_mut() {
            let entry = obj.entry(head.to_string()).or_insert(Value::Null);

            insert_value(entry, &path[1..], value);
        }
    }
}

fn flatten_recursive(value: &Value, prefix: String, output: &mut serde_json::Map<String, Value>) {
    match value {
        Value::Object(map) => {
            for (key, val) in map {
                let new_prefix = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", prefix, key)
                };
                flatten_recursive(val, new_prefix, output);
            }
        }
        Value::Array(arr) => {
            for (index, val) in arr.iter().enumerate() {
                let new_prefix = if prefix.is_empty() {
                    index.to_string()
                } else {
                    format!("{}.{}", prefix, index)
                };
                flatten_recursive(val, new_prefix, output);
            }
        }
        _ => {
            output.insert(prefix, value.clone());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{deserialize, serialize};
    use serde::{Deserialize, Serialize, de::DeserializeOwned};
    use serde_json::json;

    #[derive(Deserialize, Serialize)]
    struct StructWithField<T>
    where
        T: DeserializeOwned + Serialize,
    {
        #[serde(deserialize_with = "deserialize", serialize_with = "serialize")]
        pub data: T,
    }

    #[test]
    fn test_deserialize_simple() {
        #[derive(Deserialize, Serialize)]
        struct Data {
            pub prop1: String,
            pub prop2: u8,
        }

        let json_data = json!({
            "data": {
                "prop1": "Test",
                "prop2": 42
            }
        });

        let result: StructWithField<Data> = serde_json::from_value(json_data).unwrap();

        assert_eq!(result.data.prop1, "Test");
        assert_eq!(result.data.prop2, 42);
    }

    #[test]
    fn test_deserialize_nested() {
        #[derive(Deserialize, Serialize)]
        struct Data {
            pub nested: Nested,
        }

        #[derive(Deserialize, Serialize)]
        struct Nested {
            pub field: String,
            pub nested_deeper: NestedDeeper,
        }

        #[derive(Deserialize, Serialize)]
        struct NestedDeeper {
            pub number: i32,
        }

        let json_data = json!({
            "data": {
                "nested.field": "Test",
                "nested.nested_deeper.number": 100
            }
        });

        let result: StructWithField<Data> = serde_json::from_value(json_data).unwrap();
        assert_eq!(result.data.nested.field, "Test");
        assert_eq!(result.data.nested.nested_deeper.number, 100);
    }

    #[test]
    fn test_deserialize_object_list() {
        #[derive(Deserialize, Serialize)]
        struct Data {
            pub records: Vec<Record>,
        }

        #[derive(Deserialize, Serialize)]
        struct Record {
            pub id: i32,
            pub value: String,
        }

        let json_data = json!({
            "data": {
                "records.0.id": 1,
                "records.0.value": "A",
                "records.1.id": 2,
                "records.1.value": "B"
            }
        });

        let result: StructWithField<Data> = serde_json::from_value(json_data).unwrap();

        assert_eq!(result.data.records.len(), 2);
        assert_eq!(result.data.records[0].id, 1);
        assert_eq!(result.data.records[0].value, "A");
        assert_eq!(result.data.records[1].id, 2);
        assert_eq!(result.data.records[1].value, "B");
    }

    #[test]
    fn test_err_if_not_hashmap() {
        #[derive(Deserialize, Serialize)]
        struct Data {
            pub field: String,
        }

        let json_data = json!({
            "data": "String, not an object"
        });

        let result: Result<StructWithField<Data>, _> = serde_json::from_value(json_data);
        assert!(result.is_err());
    }

    #[test]
    fn test_serialize_dot() {
        #[derive(Deserialize, Serialize)]
        struct Data {
            pub records: Vec<Record>,
        }

        #[derive(Deserialize, Serialize)]
        struct Record {
            pub id: i32,
            pub value: String,
        }

        let data = StructWithField {
            data: Data {
                records: vec![
                    Record {
                        id: 1,
                        value: "A".to_string(),
                    },
                    Record {
                        id: 2,
                        value: "B".to_string(),
                    },
                ],
            },
        };

        let result = serde_json::to_value(&data).unwrap();

        assert_eq!(result["data"]["records.0.id"], 1);
        assert_eq!(result["data"]["records.0.value"], "A");
        assert_eq!(result["data"]["records.1.id"], 2);
        assert_eq!(result["data"]["records.1.value"], "B");
    }
}
