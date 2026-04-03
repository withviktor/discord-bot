import type { PermissionResolvable } from "discord.js";

export const PERMISSIONS_METADATA_KEY = Symbol("command:permissions");

export function RequirePermissions(...permissions: PermissionResolvable[]): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(PERMISSIONS_METADATA_KEY, permissions, target);
  };
}
