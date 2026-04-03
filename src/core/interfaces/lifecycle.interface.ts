/**
 * Implement this interface on a provider to run logic when the bot starts,
 * before it logs in to Discord.
 */
export interface OnBotInit {
  onInit(): Promise<void>;
}

/**
 * Implement this interface on a provider to run cleanup logic when the
 * process receives SIGTERM or SIGINT.
 */
export interface OnBotDestroy {
  onDestroy(): Promise<void>;
}
