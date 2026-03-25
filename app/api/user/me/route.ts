import { NextResponse } from 'next/server';
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accessiq_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "jwt_secret_key_change") as { userId: string };
    } catch (_e) {
      // Return 401 to prompt re-login without logging an expected signature error during secret rotation
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    
    await dbConnect();
    const user = await User.findById(decoded.userId).select("+githubToken");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user._id,
      name: user.name,
      email: user.email,
      githubConnected: !!user.githubToken
    });

  } catch (_error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
