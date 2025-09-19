import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { postgresDb } from '@/lib/postgres-db';

export const runtime = 'nodejs';

// POST /api/projects/[projectId]/apps - 새 앱 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // 임시로 인증 비활성화 (테스트용)
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'App name is required' },
        { status: 400 }
      );
    }

    // 임시로 기본 사용자 사용
    await postgresDb.initializeSampleData();
    const user = await postgresDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인 (멤버 이상)
    if (!(await postgresDb.hasProjectAccess(projectId, user.id, 'member'))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 프로젝트 존재 확인
    const project = await postgresDb.getProject(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const app = await postgresDb.createApp({
      projectId,
      name: name.trim(),
      currentVersion: 1,
    });

    return NextResponse.json({
      success: true,
      data: app,
      message: 'App created successfully'
    });
  } catch (error) {
    console.error('Error creating app:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}