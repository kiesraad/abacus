import { Role } from "./types/generated/openapi";

type Handle = { public?: never; roles: Role[] } | { public: true; roles?: never };

declare module "react-router" {
  import { IndexRouteObject, NonIndexRouteObject, UIMatch } from "react-router";

  type RouteObject =
    // Replace handle for routes with index=true
    | (Omit<IndexRouteObject, "handle"> & {
        handle: Handle;
      })
    // Require handle when children are not defined
    | (Omit<NonIndexRouteObject, "handle" | "children"> & {
        handle: Handle;
        children?: never;
      })
    // Don't allow handle when children are defined
    | (Omit<NonIndexRouteObject, "handle" | "children"> & {
        handle?: never;
        children: RouteObject[];
      });

  function useMatches(): UIMatch<unknown, Handle>[];
}
