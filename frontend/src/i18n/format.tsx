/* eslint-disable @typescript-eslint/no-unsafe-type-assertion -- this file relies on many TypeScript unsafe type assertions */
import { Fragment, type JSX, type ReactElement } from "react";
import { Link } from "react-router";

import type { RenderFunction } from "./i18n.types";

type AST = Array<Element | string>;

interface Element {
  tag: string;
  attributes?: Record<string, string>;
  children: AST;
}

export const DEFAULT_ALLOWED_TAGS = ["ul", "ol", "li", "p", "strong", "em", "code", "pre", "h2", "h3", "h4", "Link"];

const DEFAULT_RENDER_FUNCTIONS: Record<string, RenderFunction> = {
  Link: (element, attributes) => <Link to={attributes?.to || "."}>{element}</Link>,
};

// parse the input string into an AST
export function parse(input: string, allowed = DEFAULT_ALLOWED_TAGS): AST {
  const ast: AST = [];

  // loop over input characters
  for (let i = 0; i < input.length; i += 1) {
    // possible tag
    if (input[i] === "<") {
      let tag = "";
      const attributes: Record<string, string> = {};
      let j = i + 1;

      // find the end of the tag
      while (input[j] !== ">" && j < input.length) {
        tag += input[j] as string;
        j += 1;
      }

      const tagParts = tag.split(" ");
      tag = tagParts[0] || tag;

      // Allow attributes for render functions
      if (Object.keys(DEFAULT_RENDER_FUNCTIONS).includes(tag)) {
        tagParts.slice(1).forEach((attr) => {
          const [key, value] = attr.split("=");
          if (!key) return;

          attributes[key] = value?.replace(/"/g, "") ?? "";
        });
      }

      // check whether the tag is allowed
      if (allowed.includes(tag)) {
        j += 1;

        const openingTag = `<${tag}>`;
        const closingTag = `</${tag}>`;

        // find the closing tag
        let closingIndex = input.indexOf(closingTag, j);
        let nextIndex = input.indexOf(openingTag, j);

        // skip nested tags
        while (nextIndex !== -1 && closingIndex !== -1 && nextIndex < closingIndex) {
          nextIndex = input.indexOf(openingTag, nextIndex + openingTag.length);
          closingIndex = input.indexOf(closingTag, closingIndex + closingTag.length);
        }

        // if the closing tag is found
        if (closingIndex !== -1) {
          // parse the inner content
          const inner = input.slice(j, closingIndex);
          const children = parse(inner, allowed);

          const element: Element = {
            tag,
            children,
          };

          if (Object.keys(attributes).length > 0) {
            element.attributes = attributes;
          }

          // add this tag with its parsed content to the tree
          ast.push(element);

          // skip the closing tag
          i = closingIndex + closingTag.length - 1;
          continue;
        }
      }
    }

    if (input[i] === "\n") {
      ast.push({ tag: "br", children: [] } as Element);
      continue;
    }

    // if there is no tag, add the character to the last element
    if (ast.length > 0 && typeof ast[ast.length - 1] === "string") {
      ast[ast.length - 1] = (ast[ast.length - 1] as string) + (input[i] as string);
    } else {
      ast.push(input[i] as string);
    }
  }

  return ast;
}

// render the AST into React elements
export function renderAst(
  input: AST,
  elements: Record<string, RenderFunction> = DEFAULT_RENDER_FUNCTIONS,
): ReactElement {
  return (
    <>
      {input.map((element, i) => {
        // if the element is a string, just render it
        if (typeof element === "string") {
          // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since the input is static
          return <Fragment key={i}>{element}</Fragment>;
        }

        const { tag, children } = element;

        // if the tag registered as a render function, call the function
        if (elements[tag] !== undefined && elements[tag] instanceof Function) {
          // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since the input is static
          return <Fragment key={i}>{elements[tag](renderAst(children, elements), element.attributes)}</Fragment>;
        }

        // handle line breaks
        if (tag === "br") {
          // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since the input is static
          return <br key={i} />;
        }

        // skip empty tags
        if (children.length === 0) {
          return null;
        }

        // otherwise, render the tag
        const Element = tag as keyof JSX.IntrinsicElements;

        // biome-ignore lint/suspicious/noArrayIndexKey: we can use the index as key since the input is static
        return <Element key={i}>{renderAst(children, elements)}</Element>;
      })}
    </>
  );
}
