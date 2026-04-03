import { injectable } from "tsyringe";

export interface CommandOptions {
  name: string;
  description: string;
}

export const COMMAND_METADATA_KEY = Symbol("command:metadata");

export function Command(options: CommandOptions): ClassDecorator {
  return (target) => {
    injectable()(target);
    Reflect.defineMetadata(COMMAND_METADATA_KEY, options, target);
  };
}
