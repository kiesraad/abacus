/* eslint-disable no-console */
import { RouteObject } from "react-router";

import { routes } from "@/app/routes";
import { Role } from "@/types/generated/openapi";

interface RouteInfo {
  path: string;
  public: boolean;
  roles: Role[];
}

function collectRoutes(routes: RouteObject[], base = ""): RouteInfo[] {
  const collected: RouteInfo[] = [];

  for (const route of routes) {
    let fullPath = base;

    if (route.path) {
      if (!["*", "/"].includes(route.path)) {
        fullPath += "/";
      }

      fullPath += route.path;
    }

    // Add routes without children
    if (!route.children) {
      collected.push({
        path: fullPath,
        public: route.handle.public || false,
        roles: route.handle.roles || [],
      });
    }

    // Recursively process children
    if (route.children && route.children.length > 0) {
      collected.push(...collectRoutes(route.children, fullPath));
    }
  }

  return collected;
}

function formatTable(routeInfos: RouteInfo[]) {
  const sorted = [...routeInfos].sort((a, b) => a.path.localeCompare(b.path));

  // Calculate column widths
  const maxPathLength = Math.max(...sorted.map((r) => r.path.length));
  const maxAccessLength = Math.max(...sorted.map((r) => (r.roles.length > 0 ? r.roles.join(", ").length : 25)));

  // ANSI color codes
  const RED = "\x1b[31m";
  const GREEN = "\x1b[32m";
  const BLUE = "\x1b[34m";
  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";

  console.log(`\n${BOLD}${"Route path".padEnd(maxPathLength)} | Authorisation${RESET}`);
  console.log("-".repeat(maxPathLength) + "-+-" + "-".repeat(maxAccessLength));

  let errorCount = 0;
  for (const route of sorted) {
    const pathColumn = route.path.padEnd(maxPathLength);
    let accessColumn: string;
    let color: string;

    if (!route.public && route.roles.length === 0) {
      accessColumn = "ERROR: Not configured";
      color = RED;
      errorCount++;
    } else if (route.public && route.roles.length === 0) {
      accessColumn = "Public";
      color = GREEN;
    } else if (!route.public && route.roles.length > 0) {
      accessColumn = `Roles: ${route.roles.join(", ")}`;
      color = BLUE;
    } else {
      accessColumn = "ERROR: Wrong configuration";
      color = RED;
      errorCount++;
    }

    console.log(`${pathColumn} | ${color}${accessColumn}${RESET}`);
  }

  console.log();

  const publicCount = sorted.filter((r) => r.public).length;
  const protectedCount = sorted.filter((r) => r.roles.length > 0).length;

  console.log(`${BOLD}Summary:${RESET}`);
  console.log(`  Total: ${sorted.length}`);
  console.log(`  ${GREEN}Public: ${publicCount}${RESET}`);
  console.log(`  ${BLUE}Protected: ${protectedCount}${RESET}`);

  if (errorCount > 0) {
    console.log(`  ${RED}Errors: ${errorCount}${RESET}`);
  }

  console.log();
}

formatTable(collectRoutes(routes));
