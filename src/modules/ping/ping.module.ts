import { Module } from "../../core/decorators/module.decorator.js";
import { PingCommand } from "./ping.command.js";

@Module({
  commands: [PingCommand],
})
export class PingModule {}
