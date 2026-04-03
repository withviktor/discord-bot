import type { ClientEvents } from "discord.js";
import { injectable } from "tsyringe";

export interface EventOptions {
  name: keyof ClientEvents;
  once?: boolean;
}

export const EVENT_METADATA_KEY = Symbol("event:metadata");

export function Event(options: EventOptions): ClassDecorator {
  return (target) => {
    injectable()(target);
    Reflect.defineMetadata(EVENT_METADATA_KEY, options, target);
  };
}
