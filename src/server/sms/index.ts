import "server-only";

export interface SmsProvider {
  send(phone: string, text: string): Promise<void>;
}

/** Development provider: prints the message to the server console. */
const consoleProvider: SmsProvider = {
  async send(phone, text) {
    console.info(`[sms → ${phone}] ${text}`);
  },
};

// Planned: Eskiz.uz / Play Mobile providers, selected by SMS_PROVIDER.
export function smsProvider(): SmsProvider {
  const name = process.env.SMS_PROVIDER ?? "console";
  if (name === "console") return consoleProvider;
  throw new Error(`SMS provider "${name}" is not implemented yet`);
}

/** True when login codes are only printed locally, so the UI may show them. */
export function isDevSms(): boolean {
  return (process.env.SMS_PROVIDER ?? "console") === "console" && process.env.NODE_ENV !== "production";
}
