import { NextRequest, NextResponse } from 'next/server';
import { postgresDb } from '@/lib/postgres-db';

export const runtime = 'nodejs';

// GET /api/projects/[projectId]/apps/[appId]/versions/[versionId] - 특정 버전 조회 (스냅샷 포함)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; appId: string; versionId: string }> }
) {
  try {
    const { projectId: projectIdStr, appId: appIdStr, versionId: versionIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const appId = parseInt(appIdStr);
    const versionId = parseInt(versionIdStr);

    if (isNaN(projectId) || isNaN(appId) || isNaN(versionId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid project, app, or version ID' },
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

    const version = await postgresDb.getVersion(versionId);
    if (!version || version.appId !== appId) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: version
    });
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}