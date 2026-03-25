import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { Project } from "@/lib/models/project";
import { Scan } from "@/lib/models/scan";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId query parameter" }, { status: 400 });
    }

    // GitHub sends payload as JSON
    const payload = await req.json();

    // 1. INFINITE LOOP PREVENTION 
    // If the commit that triggered this webhook was created by our own worker, IGNORE IT.
    const commitMessage = payload?.head_commit?.message || "";
    if (commitMessage.startsWith("[AccessIQ]")) {
      console.log(`[GitHub Webhook] Ignored push event for project ${projectId} to prevent infinite loop.`);
      return NextResponse.json({ message: "Ignored: AccessIQ internal commit" }, { status: 200 });
    }

    await dbConnect();
    const project = await Project.findById(projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // 2. Queue a new scan
    const newScan = await Scan.create({
      projectId: project._id,
      targetUrls: [project.baseUrl],
      status: "PENDING",
      options: {
        discoverRoutes: true,
        maxDepth: 3,
        includeShadowDom: true,
        includeIframes: true,
        visionEmulation: false,
        securityAudit: true,
      }
    });

    console.log(`[GitHub Webhook] Queued new scan ${String(newScan._id)} for project ${projectId}`);
    return NextResponse.json({ message: "Scan queued successfully", scanId: String(newScan._id) }, { status: 200 });

  } catch (error: Error | any) {
    console.error("[GitHub Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
