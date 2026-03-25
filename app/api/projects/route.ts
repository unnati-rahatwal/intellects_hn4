import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Project } from '@/lib/models/project';

export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('GET /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.name || !body.baseUrl) {
      return NextResponse.json(
        { error: 'Name and baseUrl are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(body.baseUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid base URL' },
        { status: 400 }
      );
    }

    const project = await Project.create({
      name: body.name,
      baseUrl: body.baseUrl,
      description: body.description || '',
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
