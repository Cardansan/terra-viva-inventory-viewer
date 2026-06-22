import { NextResponse } from "next/server";
import { readPublisherSessionConfig } from "@/lib/publisherLocalConfig";

export async function GET() {
  const sessionConfig = await readPublisherSessionConfig();

  return NextResponse.json({
    driveFolderId: sessionConfig.driveFolderId,
    googleDriveAccessToken: sessionConfig.googleDriveAccessToken
  });
}
