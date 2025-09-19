import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { postgresDb } from '@/lib/postgres-db';

// POST /api/projects/[projectId]/apps/[appId]/versions - 새 버전 발행
export async function POST(
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
    const { versionNumber, publisherName, notes } = body;

    // 임시로 기본 사용자 사용
    await postgresDb.initializeSampleData();
    const user = await postgresDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인 (멤버 이상)
    if (!(await postgresDb.hasAppAccess(appId, user.id, 'member'))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 앱 존재 확인
    const app = await postgresDb.getApp(appId);
    if (!app || app.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    // 버전 발행
    const version = await postgresDb.publishVersion(appId, {
      versionNumber: versionNumber || (app.currentVersion + 1),
      publisherId: user.id,
      publisherName: publisherName || user.name,
      notes: notes || ''
    });

    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Failed to publish version' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: version,
      message: `Version ${version.versionNumber} published successfully`
    });
  } catch (error) {
    console.error('Error publishing version:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[projectId]/apps/[appId]/versions - 버전 목록 조회
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
    await postgresDb.initializeSampleData();
    const user = await postgresDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인
    if (!(await postgresDb.hasAppAccess(appId, user.id))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const versions = await postgresDb.getVersionsByApp(appId);

    return NextResponse.json({
      success: true,
      data: versions
    });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}