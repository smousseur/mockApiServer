import * as path from "path";

export const ROUTES_DIRECTORY = process.env.ROUTES || "routes";
export const SCHEMAS_DIRECTORY = "schemas";
export const DEFAULT_DIRECTORY = "default";
export const METADATAS_DIRECTORY = "metadatas";
export const APP_ROOT = path.resolve(__dirname, "../..");

export const ROUTE_ROOT_DIR = path.join(APP_ROOT, ROUTES_DIRECTORY);
export const getRouteDirectory = (routePath: string, dataDir?: string) => path.join(APP_ROOT, ROUTES_DIRECTORY, routePath, dataDir ? dataDir : "");
export const getSchemasDirectory = (routePath: string) => getRouteDirectory(routePath, SCHEMAS_DIRECTORY);
