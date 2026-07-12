import { Module } from "../../core/decorators/module.decorator.js";
import { AutoModEvent } from "./automod.event.js";
import { AutoModService } from "./automod.service.js";

@Module({
  events: [AutoModEvent],
  providers: [AutoModService],
})
export class AutoModModule {}
