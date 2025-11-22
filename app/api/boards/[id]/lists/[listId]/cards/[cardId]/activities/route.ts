// app/api/boards/[id]/lists/[listId]/cards/[cardId]/activities/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string; cardId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: boardId, listId, cardId } = await params;
    const supabase = await createClient();

    // Get board to check access
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('organization_id')
      .eq('id', boardId)
      .single();

    if (boardError || !board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      );
    }

    // Check if user is member
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', board.organization_id)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You do not have access to this board' },
        { status: 403 }
      );
    }

    // Get activities
    const { data: activities, error: activitiesError } = await supabase
      .from('task_activities')
      .select('*')
      .eq('task_id', cardId)
      .order('created_at', { ascending: false });

    if (activitiesError) {
      console.error('Supabase error:', activitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activities,
      success: true,
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}