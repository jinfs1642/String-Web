import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { memoryDb } from '@/lib/memory-db';

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
    await memoryDb.initializeSampleData();
    const user = memoryDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인 (멤버 이상)
    if (!memoryDb.hasAppAccess(appId, user.id, 'member')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 앱 존재 확인
    const app = memoryDb.getApp(appId);
    if (!app || app.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: 'App not found' },
        { status: 404 }
      );
    }

    // 현재 스트링들을 가져와서 스냅샷 생성
    const currentStrings = memoryDb.getStringsByApp(appId, 1, 10000).data;

    // 버전 발행
    const version = memoryDb.publishVersion(appId, {
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
    await memoryDb.initializeSampleData();
    const user = memoryDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 권한 확인
    if (!memoryDb.hasAppAccess(appId, user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const versions = memoryDb.getVersionsByApp(appId);

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