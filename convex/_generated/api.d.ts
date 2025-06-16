/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as affirmations from "../affirmations.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as router from "../router.js";
import type * as sampleData from "../sampleData.js";
import type * as userSettings from "../userSettings.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  affirmations: typeof affirmations;
  ai: typeof ai;
  auth: typeof auth;
  http: typeof http;
  router: typeof router;
  sampleData: typeof sampleData;
  userSettings: typeof userSettings;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
