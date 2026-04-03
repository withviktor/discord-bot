import { Module } from "../../core/decorators/module.decorator.js";
import { ConfigCommand } from "./config.command.js";
import { ConfigService } from "./config.service.js";

@Module({
  commands: [ConfigCommand],
  providers: [ConfigService],
})
export class ConfigModule {}
