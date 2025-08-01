import assert from "assert";
import { format, resolveConfig, resolveConfigFile } from "prettier";

import {
  NonArraySchemaObjectType,
  OpenAPIV3,
  OperationObject,
  PathsObject,
  ReferenceObject,
  SchemaObject,
} from "./openapi";

export async function generate(openApiString: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const spec = JSON.parse(openApiString) as OpenAPIV3;

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

  const configPath = await resolveConfigFile();
  const localOptions = await resolveConfig(configPath || "./");
  const options = localOptions ?? {};

  s = await format(s, { parser: "typescript", ...options });

  return s;
}

function addPath(path: string, v: PathsObject | undefined) {
  if (!v) return "";

  const result: string[] = [`// ${path}`];
  for (const method in v) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    result.push(addRequest(path, v[method] as OperationObject));
  }

  return result.join("\n");
}

function addRequest(requestPath: string, request: OperationObject) {
  const result: string[] = [];
  assert(typeof request.operationId === "string");
  let id: string = request.operationId;
  id = id.toUpperCase();

  if (request.parameters) {
    result.push(`export interface ${id}_REQUEST_PARAMS {`);
    request.parameters.forEach((p) => {
      if ("$ref" in p) {
        result.push(`// ${p.$ref.substring(p.$ref.lastIndexOf("/") + 1)}`);
      } else {
        const paramType = tsType(p.schema);
        requestPath = requestPath.replace(`{${p.name}}`, `\${${paramType}}`);
        result.push(`${p.name}: ${paramType};`);
      }
    });
    result.push("}");
  } else {
    // From ESLint: An empty interface declaration allows any non-nullish value, including literals like `0` and `""`.
    // More information: https://www.totaltypescript.com/the-empty-object-type-in-typescript
    result.push(`export type ${id}_REQUEST_PARAMS = Record<string, never>;`);
  }
  result.push(`export type ${id}_REQUEST_PATH = \`${requestPath}\`;`);

  if (request.requestBody) {
    if ("$ref" in request.requestBody) {
      result.push(
        `export type ${id}_REQUEST_BODY = ${request.requestBody.$ref.substring(request.requestBody.$ref.lastIndexOf("/") + 1)};`,
      );
    } else {
      const media = request.requestBody.content["application/json"];
      if (media?.schema) {
        if ("$ref" in media.schema) {
          result.push(
            `export type ${id}_REQUEST_BODY = ${media.schema.$ref.substring(media.schema.$ref.lastIndexOf("/") + 1)};`,
          );
        }
      }
    }
  }
  return result.join("\n");
}

function addDefinition(name: string, v: ReferenceObject | SchemaObject) {
  if ("$ref" in v) {
    return tsType(v);
  }

  const result: string[] = [];
  if (v.description) {
    result.push("/**");
    result.push(" * " + v.description.split("\n").join("\n * "));
    result.push(" */");
  }

  if (v.type === "object") {
    result.push(`export interface ${name} ${tsType(v)}`);
  } else {
    result.push(`export type ${name} = ${tsType(v)};`);
  }

  return result.join("\n");
}

function tsType(s: ReferenceObject | SchemaObject | undefined): string {
  if (!s) return "unknown";

  if ("$ref" in s) {
    return s.$ref.substring(s.$ref.lastIndexOf("/") + 1);
  }

  if (s.allOf) {
    return s.allOf.map((s2) => tsType(s2)).join(" & ");
  }

  if (s.oneOf) {
    return s.oneOf.map((obj) => tsType(obj)).join(" | ");
  }

  if (s.enum) {
    return s.enum.map((e) => `"${e}"`).join(" | ");
  }

  let type = "unknown";

  switch (s.type) {
    case "string":
    case "boolean":
      type = s.type;
      break;
    case "integer":
    case "number":
      type = "number";
      break;
    case "array":
      type = `${tsType(s.items)}[]`;
      break;
    case "object":
      if (s.properties) {
        type = "{";
        Object.entries(s.properties).forEach(([k, v2]) => {
          if ("description" in v2 && v2.description) {
            type += `\n  /** ${v2.description} */\n`;
          }
          type += `  ${k}${isRequired(k, s.required)}: ${tsType(v2)};`;
        });
        type += "}";
      }
      break;
  }

  if (s.nullable) {
    type += " | null";
  }

  if (Array.isArray(s.type)) {
    type = s.type
      .map((t: NonArraySchemaObjectType | "null" | "array") => {
        if (t === "null") {
          return "null";
        }

        if (t === "array") {
          if ("items" in s) {
            return tsType({ type: t, items: s.items });
          } else {
            // Cannot determine type; type remains "unknown"
          }
        } else {
          return tsType({ type: t });
        }
      })
      .join(" | ");
  }

  return type;
}

function isRequired(k: string, req: string[] | undefined): string {
  if (!req) {
    return "?";
  }
  return req.includes(k) ? "" : "?";
}
