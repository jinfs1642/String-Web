import { NextRequest, NextResponse } from 'next/server';
import { memoryDb } from '@/lib/memory-db';

// GET /api/projects/[projectId] - 특정 프로젝트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ success: false, error: 'Invalid project ID' }, { status: 400 });
    }

    // 임시로 기본 사용자 사용
    await memoryDb.initializeSampleData();
    const user = memoryDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인
    if (!memoryDb.hasProjectAccess(projectId, user.id, 'viewer')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const project = memoryDb.getProject(projectId);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // 프로젝트에 앱 정보 포함
    const apps = memoryDb.getAppsByProject(projectId);
    const projectWithApps = {
      ...project,
      apps: apps.map(app => ({
        ...app,
        strings: memoryDb.getStringsByApp(app.id, 1, 1000).data
      }))
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
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = parseInt(params.projectId, 10);
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
    await memoryDb.initializeSampleData();
    const user = memoryDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인 (최소 'admin' 역할 필요)
    if (!memoryDb.hasProjectAccess(projectId, user.id, 'admin')) {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }

    const updatedProject = memoryDb.updateProject(projectId, { 
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