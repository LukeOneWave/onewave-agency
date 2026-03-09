import { prisma } from "@/lib/prisma";

export const settingsService = {
  async getApiKey(): Promise<string | null> {
    const setting = await prisma.setting.findUnique({
      where: { key: "anthropic_api_key" },
    });
    return setting?.value ?? null;
  },

  async setApiKey(apiKey: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key: "anthropic_api_key" },
      update: { value: apiKey },
      create: { key: "anthropic_api_key", value: apiKey },
    });
  },

  async hasApiKey(): Promise<boolean> {
    const setting = await prisma.setting.findUnique({
      where: { key: "anthropic_api_key" },
    });
    return !!setting?.value;
  },

  async getMaskedKey(): Promise<string | null> {
    const key = await this.getApiKey();
    if (!key) return null;
    if (key.length <= 8) return "****";
    return key.substring(0, 7) + "..." + key.slice(-4);
  },

  async deleteApiKey(): Promise<void> {
    await prisma.setting.deleteMany({
      where: { key: "anthropic_api_key" },
    });
  },
};
