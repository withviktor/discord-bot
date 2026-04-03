// biome-ignore lint/suspicious/noExplicitAny: constructor type requires any
type Constructor = new (...args: any[]) => unknown;

export interface ModuleOptions {
  imports?: Constructor[];
  commands?: Constructor[];
  events?: Constructor[];
  providers?: Constructor[];
}

export const MODULE_METADATA_KEY = Symbol("module:metadata");

export function Module(options: ModuleOptions): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(MODULE_METADATA_KEY, options, target);
  };
}
