import { ActivityType, type Client } from "discord.js";
import { injectable } from "tsyringe";

@injectable()
export class ActivityService {
  refresh(client: Client): void {
    const userCount = client.guilds.cache.reduce((sum, guild) => sum + guild.memberCount, 0);
    client.user?.setActivity(`${userCount.toLocaleString()} users`, {
      type: ActivityType.Watching,
    });
  }
}
