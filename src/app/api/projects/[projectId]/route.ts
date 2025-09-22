import { NextRequest, NextResponse } from 'next/server';
import { postgresDb } from '@/lib/postgres-db';

export const runtime = 'nodejs';

// GET /api/projects/[projectId] - 특정 프로젝트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    // 임시로 기본 사용자 사용
    const user = await postgresDb.ensureUserExists('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인
    if (!(await postgresDb.hasProjectAccess(projectId, user.id, 'viewer'))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const project = await postgresDb.getProject(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // 프로젝트에 앱 정보 포함
    const apps = await postgresDb.getAppsByProject(projectId);
    const projectWithApps = {
      ...project,
      apps: await Promise.all(apps.map(async app => ({
        ...app,
        strings: (await postgresDb.getStringsByApp(app.id, 1, 1000)).data
      })))
    };

    return NextResponse.json({
      success: true,
      data: projectWithApps
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId] - 프로젝트 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Project name is required' },
        { status: 400 }
      );
    }

    // 임시로 기본 사용자 사용
    const user = await postgresDb.ensureUserExists('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인 (최소 'admin' 역할 필요)
    if (!(await postgresDb.hasProjectAccess(projectId, user.id, 'admin'))) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const updatedProject = await postgresDb.updateProject(projectId, { 
      name: name.trim(),
      description: description?.trim()
    });

    if (!updatedProject) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}