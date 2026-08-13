import { NextRequest, NextResponse } from "next/server";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const secretsClient = new SecretManagerServiceClient();
let _cachedAdmin: string | undefined;

async function getAdminPassword(): Promise<string | undefined> {
  if (_cachedAdmin) return _cachedAdmin;

  const name = process.env.ADMIN_SECRET_NAME || "projects/<PROJECT_ID>/secrets/tnffm156/versions/latest";

  try {
    const [version] = await secretsClient.accessSecretVersion({ name });
    const payload = version?.payload?.data;
    if (!payload) return undefined;
    _cachedAdmin = Buffer.from(payload as Uint8Array).toString("utf8");
    return _cachedAdmin;
  } catch (err) {
    console.error("Failed to access admin secret:", err);
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  const { password } = (await request.json()) as { password?: string };
  const expected = await getAdminPassword();

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "Server misconfiguration: ADMIN secret not available" },
      { status: 500 }
    );
  }

  if (password === expected) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}
