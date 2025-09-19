import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { postgresDb } from '@/lib/postgres-db';

export const runtime = 'nodejs';

// PUT /api/projects/[projectId]/apps/[appId]/strings/[stringId] - 스트링 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; appId: string; stringId: string }> }
) {
  try {
    // 임시로 인증 비활성화 (테스트용)
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { projectId: projectIdStr, appId: appIdStr, stringId: stringIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const appId = parseInt(appIdStr);
    const stringId = parseInt(stringIdStr);

    if (isNaN(projectId) || isNaN(appId) || isNaN(stringId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid IDs' },
        { status: 400 }
      );
    }

    const body = await request.json();

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

    // 스트링이 해당 앱에 속하는지 확인
    const allStrings = (await postgresDb.getStringsByApp(appId, 1, 10000)).data;
    const existingString = allStrings.find(s => s.id === stringId);
    if (!existingString) {
      return NextResponse.json(
        { success: false, error: 'String not found' },
        { status: 404 }
      );
    }

    const updatedString = await postgresDb.updateString(stringId, {
      ...body,
      modifiedAt: new Date(),
      modifiedBy: user.id,
    });

    if (!updatedString) {
      return NextResponse.json(
        { success: false, error: 'Failed to update string' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedString,
      message: 'String updated successfully'
    });
  } catch (error) {
    console.error('Error updating string:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId]/apps/[appId]/strings/[stringId] - 스트링 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; appId: string; stringId: string }> }
) {
  try {
    // 임시로 인증 비활성화 (테스트용)
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { projectId: projectIdStr, appId: appIdStr, stringId: stringIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const appId = parseInt(appIdStr);
    const stringId = parseInt(stringIdStr);

    if (isNaN(projectId) || isNaN(appId) || isNaN(stringId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid IDs' },
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
    if (!(await postgresDb.hasAppAccess(appId, user.id, 'member'))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 스트링이 해당 앱에 속하는지 확인
    const allStrings = (await postgresDb.getStringsByApp(appId, 1, 10000)).data;
    const existingString = allStrings.find(s => s.id === stringId);
    if (!existingString) {
      return NextResponse.json(
        { success: false, error: 'String not found' },
        { status: 404 }
      );
    }

    const deleted = await postgresDb.deleteString(stringId);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete string' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'String deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting string:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}