import { promises as fs } from "node:fs";
import path from "node:path";

type PublisherLocalConfig = {
  driveFolderId?: string;
  googleDriveAccessToken?: string;
  googleDriveRefreshToken?: string;
  googleDriveClientId?: string;
  googleDriveClientSecret?: string;
  googleDriveAccessTokenExpiresAt?: string;
} & Record<string, unknown>;

export type PublisherSessionConfig = {
  driveFolderId: string;
  googleDriveAccessToken: string;
  googleDriveRefreshToken: string;
  googleDriveClientId: string;
  googleDriveClientSecret: string;
  googleDriveAccessTokenExpiresAt: string;
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
      googleDriveAccessToken: parsed.googleDriveAccessToken?.trim() || "",
      googleDriveRefreshToken: parsed.googleDriveRefreshToken?.trim() || "",
      googleDriveClientId: parsed.googleDriveClientId?.trim() || "",
      googleDriveClientSecret: parsed.googleDriveClientSecret?.trim() || "",
      googleDriveAccessTokenExpiresAt:
        parsed.googleDriveAccessTokenExpiresAt?.trim() || ""
    };
  } catch {
    return {
      driveFolderId: "",
      googleDriveAccessToken: "",
      googleDriveRefreshToken: "",
      googleDriveClientId: "",
      googleDriveClientSecret: "",
      googleDriveAccessTokenExpiresAt: ""
    };
  }
}

export async function writePublisherSessionConfig(
  nextConfig: PublisherSessionConfig
) {
  let existingConfig: PublisherLocalConfig = {};

  try {
    existingConfig = JSON.parse(
      await fs.readFile(localConfigPath, "utf8")
    ) as PublisherLocalConfig;
  } catch {
    existingConfig = {};
  }

  await fs.writeFile(
    localConfigPath,
    `${JSON.stringify(
      {
        ...existingConfig,
        driveFolderId: nextConfig.driveFolderId,
        googleDriveAccessToken: nextConfig.googleDriveAccessToken,
        googleDriveRefreshToken: nextConfig.googleDriveRefreshToken,
        googleDriveClientId: nextConfig.googleDriveClientId,
        googleDriveClientSecret: nextConfig.googleDriveClientSecret,
        googleDriveAccessTokenExpiresAt:
          nextConfig.googleDriveAccessTokenExpiresAt
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}
