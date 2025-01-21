import assert from "assert";
import { format, resolveConfig, resolveConfigFile } from "prettier";

import { OpenAPIV3, OperationObject, PathsObject, ReferenceObject, SchemaObject } from "./openapi";

export async function generate(openApiString: string): Promise<string> {
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
    return v.$ref.substring(v.$ref.lastIndexOf("/") + 1);
  }

  const result: string[] = [];
  if (v.description) {
    result.push("/**");
    result.push(` * ${v.description}`);
    result.push(" */");
  }

  if (v.type === "object") {
    if (v.properties) {
      result.push(`export interface ${name} {`);
      Object.entries(v.properties).forEach(([k, v2]) => {
        result.push(`  ${k}${isRequired(k, v.required)}: ${tsType(v2)};`);
      });
      result.push("}");
    }
  } else if (v.type === "string") {
    if (v.enum) {
      result.push(`export type ${name} = ${v.enum.map((e) => `"${e}"`).join(" | ")};`);
    }
  } else if (v.oneOf) {
    const types: string[] = [];
    for (const obj of v.oneOf) {
      if ("properties" in obj && obj.properties) {
        for (const property of Object.values(obj.properties)) {
          if ("$ref" in property) {
            types.push(property.$ref.substring(property.$ref.lastIndexOf("/") + 1));
          }
        }
      }
    }
    result.push(`export type ${name} = ${types.join(" | ")};`);
  }

  return result.join("\n");
}

function tsType(s: ReferenceObject | SchemaObject | undefined): string {
  //TODO: handle missing schema
  if (!s) return "string";
  if ("$ref" in s) {
    return s.$ref.substring(s.$ref.lastIndexOf("/") + 1);
  }

  if ("allOf" in s) {
    if (s.allOf) {
      return s.allOf.map((s2) => tsType(s2)).join(" & ");
    }
  }

  if ("oneOf" in s) {
    return (
      s.oneOf
        ?.map((obj) => {
          if ("$ref" in obj) {
            return obj.$ref.substring(obj.$ref.lastIndexOf("/") + 1);
          }
          return obj.type || "unknown";
        })
        .join(" | ") ?? "unknown"
    );
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
  }

  if (s.nullable) {
    type += " | null";
  }
  return type;
}

function isRequired(k: string, req: string[] | undefined): string {
  if (!req) {
    return "";
  }
  return req.includes(k) ? "" : "?";
}
