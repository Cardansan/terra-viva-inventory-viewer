import { NextResponse } from "next/server";
import { resolveDriveSessionDiagnostics } from "@/lib/googleDriveSession";

export async function GET() {
  const sessionConfig = await resolveDriveSessionDiagnostics();

  return NextResponse.json({
    driveFolderId: sessionConfig.driveFolderId,
    googleDriveAccessToken: sessionConfig.googleDriveAccessToken,
    hasAccessToken: sessionConfig.hasAccessToken,
    hasRefreshToken: sessionConfig.hasRefreshToken,
    canAutoRefresh: sessionConfig.canAutoRefresh,
    severity: sessionConfig.severity,
    message: sessionConfig.message
  });
}
