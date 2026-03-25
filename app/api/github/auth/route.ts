import { NextResponse } from "next/server";

export async function GET(_req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub integration not configured. Missing GITHUB_CLIENT_ID in .env" },
      { status: 500 }
    );
  }

  // Note: hardcoded localhost for hackathon MVP. In prod, you'd use env vars for the base URL.
  const redirectUri = `http://localhost:3000/api/github/callback`;
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;

  return NextResponse.redirect(githubUrl);
}
