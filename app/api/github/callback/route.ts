import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided by GitHub" }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("accessiq_token");
    
    if (!tokenCookie) {
       return NextResponse.redirect(new URL("/login?error=Please login before connecting GitHub", req.url));
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(
        tokenCookie.value,
        process.env.JWT_SECRET || "jwt_secret_key_change"
      ) as { userId: string };
    } catch (e) {
      console.error("JWT Verify Error in GitHub Callback:", e);
      return NextResponse.redirect(new URL("/login?error=Session expired. Please login again.", req.url));
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "GitHub integration not configured. Missing secrets in .env" }, 
        { status: 500 }
      );
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
       return NextResponse.json({ error: tokenData.error_description || "GitHub OAuth failed" }, { status: 400 });
    }

    const githubToken = tokenData.access_token;

    // Save token to the user's document
    await dbConnect();
    await User.findByIdAndUpdate(decoded.userId, { githubToken });

    // Redirect back to dashboard successfully
    return NextResponse.redirect(new URL("/projects?github=connected", req.url));

  } catch (error: any) {
     console.error("GitHub Auth Error:", error);
     return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
