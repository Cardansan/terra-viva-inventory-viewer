import { promises as fs } from "node:fs";
import path from "node:path";

type PublisherLocalConfig = {
  driveFolderId?: string;
  googleDriveAccessToken?: string;
};

export type PublisherSessionConfig = {
  driveFolderId: string;
  googleDriveAccessToken: string;
};

const localConfigPath = path.join(
  process.cwd(),
  "terra-viva.publisher.local.json"
);

export async function readPublisherSessionConfig(): Promise<PublisherSessionConfig> {
  try {
    const rawConfig = await fs.readFile(localConfigPath, "utf8");
    const parsed = JSON.parse(rawConfig) as PublisherLocalConfig;

    return {
      driveFolderId: parsed.driveFolderId?.trim() || "",
      googleDriveAccessToken: parsed.googleDriveAccessToken?.trim() || ""
    };
  } catch {
    return {
      driveFolderId: "",
      googleDriveAccessToken: ""
    };
  }
}
