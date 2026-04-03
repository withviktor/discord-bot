import { Module } from "./core/decorators/module.decorator.js";
import { ReadyEvent } from "./events/ready.event.js";
import { PingModule } from "./modules/ping/ping.module.js";
import { LoggerService } from "./services/logger.service.js";

@Module({
  imports: [PingModule],
  events: [ReadyEvent],
  providers: [LoggerService],
})
export class AppModule {}
