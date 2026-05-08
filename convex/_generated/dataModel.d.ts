/* eslint-disable */
/** Stub. Overwritten by `npx convex dev`. */

import type { GenericId } from "convex/values";

export type TableNames =
  | "display"
  | "contents"
  | "layers"
  | "strokes"
  | "scenes"
  | "signaling"
  | "_storage";

export type Id<TableName extends TableNames | string = string> = GenericId<TableName extends TableNames ? TableName : TableNames>;

export type Doc<TableName extends TableNames | string = string> = {
  _id: Id<TableName extends TableNames ? TableName : TableNames>;
  _creationTime: number;
  [key: string]: any;
};

export type DataModel = any;
