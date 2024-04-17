import assert from "assert";
import fs from "fs";
import prettier from "prettier";
import { OpenAPIV3, ReferenceObject, SchemaObject, PathsObject, OperationObject } from "./openapi";

const TARGET_PATH = "./lib/api/gen";
const FILE_NAME = "openapi.ts";

async function run() {
  const fileString = fs.readFileSync("../backend/openapi.json", "utf8");
  if (!fileString) {
    return;
  }

  const spec = JSON.parse(fileString) as OpenAPIV3;

  if (fs.existsSync(TARGET_PATH)) {
    fs.rmSync(TARGET_PATH, { recursive: true });
  }
  fs.mkdirSync(TARGET_PATH);

  const result = ["// Generated by ./scripts/gen_openapi_types.ts\n\n"];
  assert(spec["components"] !== undefined);

  const schemas = spec.components.schemas;
  if (!schemas) {
    throw new Error("No schemas found in OpenAPI spec");
  }

  const paths: string[] = Object.entries(spec.paths).map(([k, v]) => addPath(k, v));
  const types: string[] = Object.entries(schemas).map(([k, v]) => addDefinition(k, v));

  result.push("\n\n");

  result.push("/** PATHS **/\n\n");
  result.push(paths.join("\n\n"));

  result.push("\n\n");

  result.push("/** TYPES **/\n\n");
  result.push(types.join("\n\n"));

  let s = result.join("\n");
  s = await prettier.format(s, { parser: "typescript" });
  fs.writeFileSync(`${TARGET_PATH}/${FILE_NAME}`, s);
}

run().catch((e: unknown) => {
  console.error(e);
});

function addPath(path: string, v: PathsObject | undefined) {
  if (!v) return "";
  const result: string[] = [`// ${path}`];
  let requestPath = path;
  if (v.post) {
    const post = v.post as OperationObject;

    assert(typeof post.operationId === "string");
    let id: string = post.operationId;
    id = id.toUpperCase();

    result.push(`export interface ${id}_REQUEST_PARAMS {`);
    if (post.parameters) {
      post.parameters.forEach((p) => {
        if ("$ref" in p) {
          result.push(`// ${p.$ref.substring(p.$ref.lastIndexOf("/") + 1)}`);
        } else {
          const paramType = tsType(p.schema);
          requestPath = requestPath.replace(`{${p.name}}`, `\${${paramType}}`);
          result.push(`${p.name}: ${paramType};`);
        }
      });
    }
    result.push("}");
    result.push(`export type ${id}_REQUEST_PATH = \`${requestPath};\``);

    if (post.requestBody) {
      if ("$ref" in post.requestBody) {
        result.push(
          `export type ${id}_REQUEST_BODY = ${post.requestBody.$ref.substring(post.requestBody.$ref.lastIndexOf("/") + 1)};`
        );
      } else {
        const media = post.requestBody.content["application/json"];
        if (media?.schema) {
          if ("$ref" in media.schema) {
            result.push(
              `export type ${id}_REQUEST_BODY = ${media.schema.$ref.substring(media.schema.$ref.lastIndexOf("/") + 1)};`
            );
          }
        }
        // result.push(`export interface ${id}_REQUEST_BODY {`);
        // result.push('}');
      }
    }
  }

  return result.join("\n");
}

function addDefinition(name: string, v: ReferenceObject | SchemaObject) {
  if ("$ref" in v) {
    return v.$ref.substring(v.$ref.lastIndexOf("/") + 1);
  }

  const result: string[] = [];
  if (v.description) {
    result.push("/**");
    result.push(` * ${v.description}`);
    result.push(" */");
  }
  result.push(`export interface ${name} {`);
  if (v.type === "object") {
    if (v.properties) {
      Object.entries(v.properties).forEach(([k, v2]) => {
        result.push(`  ${k}${isRequired(k, v.required)}: ${tsType(v2)};`);
      });
    }
  }
  result.push("}");

  return result.join("\n");

  // props.forEach(([k, v2]: [string, any]) => {
  //   ar.push(`  ${k}${isRequired(k, v.required)}: ${tsType(v2.type)};`);
  // });
}

function tsType(s: ReferenceObject | SchemaObject | undefined): string {
  //TODO: handle missing schema
  if (!s) return "string";
  if ("$ref" in s) {
    return s.$ref.substring(s.$ref.lastIndexOf("/") + 1);
  }

  switch (s.type) {
    case "string":
      return "string";
    case "integer":
      return "number";
    case "number":
      return "number";
    default:
      //TODO: catch all types, any is not allowd
      return "any";
  }
}

function isRequired(k: string, req: string[] | undefined): string {
  if (!req) {
    return "";
  }
  return req.includes(k) ? "" : "?";
}
