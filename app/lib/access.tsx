"use client";

import { createContext, useContext } from "react";

export type FleetoraRole = "owner" | "admin" | "dispatcher" | "accountant" | "viewer";
export const AccessContext = createContext<FleetoraRole>("viewer");
export const useAccess = () => {
  const role = useContext(AccessContext);
  return {
    role,
    canWrite: role !== "viewer",
    canOperate: role === "owner" || role === "admin" || role === "dispatcher",
    canAccount: role === "owner" || role === "admin" || role === "accountant",
    canDelete: role === "owner" || role === "admin",
    canAdmin: role === "owner" || role === "admin",
  };
};
