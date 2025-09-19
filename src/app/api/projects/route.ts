import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { memoryDb } from '@/lib/memory-db';

// GET /api/projects - 사용자의 프로젝트 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 임시로 인증 비활성화 (테스트용)
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // 임시로 기본 사용자 사용 (나중에 실제 인증으로 변경)
    await memoryDb.initializeSampleData();
    const user = memoryDb.getUserByEmail('admin@example.com');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const projects = memoryDb.getProjectsByUser(user.id);

    // 각 프로젝트에 앱 정보 포함
    const projectsWithApps = projects.map(project => ({
      ...project,
      apps: memoryDb.getAppsByProject(project.id)
    }));

    return NextResponse.json({
      success: true,
      data: projectsWithApps
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects - 새 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    // 임시로 인증 비활성화 (테스트용)
    // const session = await getServerSession();
    // if (!session?.user?.email) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

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

    const project = memoryDb.createProject({
      name: name.trim(),
      description: description?.trim(),
      createdBy: user.id,
    }, user.id);

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}