import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { postgresDb } from '@/lib/postgres-db';

export const runtime = 'nodejs';

// GET /api/projects/[projectId]/apps/[appId] - 특정 앱 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; appId: string }> }
) {
  try {
    // 임시로 인증 비활성화 (테스트용)
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { projectId: projectIdStr, appId: appIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const appId = parseInt(appIdStr);

    if (isNaN(projectId) || isNaN(appId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project or app ID' },
        { status: 400 }
      );
    }

    // 임시로 기본 사용자 사용
    const user = await postgresDb.ensureUserExists('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인
    if (!(await postgresDb.hasAppAccess(appId, user.id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const app = await postgresDb.getApp(appId);
    if (!app || app.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    // 앱에 스트링 정보 포함
    const stringsData = await postgresDb.getStringsByApp(appId, 1, 10000);
    const versions = await postgresDb.getVersionsByApp(appId);

    const appWithData = {
      ...app,
      strings: stringsData.data,
      versions: versions
    };

    return NextResponse.json({
      success: true,
      data: appWithData
    });
  } catch (error) {
    console.error('Error fetching app:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[projectId]/apps/[appId] - 앱 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; appId: string }> }
) {
  try {
    // 임시로 인증 비활성화 (테스트용)
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { projectId: projectIdStr, appId: appIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const appId = parseInt(appIdStr);

    if (isNaN(projectId) || isNaN(appId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project or app ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // 임시로 기본 사용자 사용
    const user = await postgresDb.ensureUserExists('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인 (멤버 이상)
    if (!(await postgresDb.hasAppAccess(appId, user.id, 'member'))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updatedApp = await postgresDb.updateApp(appId, body);
    if (!updatedApp) {
      return NextResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedApp,
      message: 'App updated successfully'
    });
  } catch (error) {
    console.error('Error updating app:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}