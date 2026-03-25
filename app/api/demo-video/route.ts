import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  const primaryPath = path.resolve(process.cwd(), "DemoVideo.mp4");
  const fallbackPath = path.resolve(process.cwd(), "..", "DemoVideo.mp4");

  try {
    let videoPath = primaryPath;

    try {
      await fs.access(videoPath);
    } catch {
      videoPath = fallbackPath;
    }

    const videoBuffer = await fs.readFile(videoPath);

    return new Response(videoBuffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'inline; filename="DemoVideo.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Demo video not found. Expected file at workspace root: DemoVideo.mp4", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
