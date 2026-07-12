export interface IEvent {
  // biome-ignore lint/suspicious/noExplicitAny: event args vary per event type
  execute(...args: any[]): Promise<void>;
}
