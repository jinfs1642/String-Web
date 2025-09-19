import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { memoryDb } from '@/lib/memory-db';

// GET /api/projects/[projectId]/apps/[appId]/strings - 스트링 목록 조회
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

    // URL 파라미터에서 페이지네이션 정보 추출
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

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

    const stringsData = memoryDb.getStringsByApp(appId, page, limit);

    const paginatedResponse = {
      data: stringsData.data,
      total: stringsData.total,
      page,
      limit,
      totalPages: Math.ceil(stringsData.total / limit)
    };

    return NextResponse.json({
      success: true,
      data: paginatedResponse
    });
  } catch (error) {
    console.error('Error fetching strings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/apps/[appId]/strings - 새 스트링 생성
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
    const { key, value, additionalColumns, status } = body;

    if (!key?.trim() || !value?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Key and value are required' },
        { status: 400 }
      );
    }

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

    const newString = memoryDb.createString({
      appId,
      key: key.trim(),
      value: value.trim(),
      additionalColumns,
      status: status || 'new',
      modifiedAt: new Date(),
      modifiedBy: user.id,
    });

    return NextResponse.json({
      success: true,
      data: newString,
      message: 'String created successfully'
    });
  } catch (error) {
    console.error('Error creating string:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}