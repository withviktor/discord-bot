import { Module } from "../../core/decorators/module.decorator.js";
import { WelcomeEvent } from "./welcome.event.js";

@Module({
  events: [WelcomeEvent],
})
export class WelcomeModule {}
