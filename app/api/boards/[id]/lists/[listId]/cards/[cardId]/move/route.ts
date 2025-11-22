// app/api/boards/[id]/lists/[listId]/cards/[cardId]/move/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLogger';

export async function PATCH(
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

    const { id: boardId, listId: sourceListId, cardId } = await params;
    const { target_list_id } = await request.json();

    const supabase = await createClient();

    // Get board
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

    // Get source and target list names
    const { data: sourceList } = await supabase
      .from('sectional_columns')
      .select('title')
      .eq('id', sourceListId)
      .single();

    const { data: targetList } = await supabase
      .from('sectional_columns')
      .select('title')
      .eq('id', target_list_id)
      .single();

    // Move card to new list
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ sectional_column_id: target_list_id, sort_order: 0 })
      .eq('id', cardId)
      .eq('sectional_column_id', sourceListId);

    if (updateError) {
      console.error('Supabase error:', updateError);
      return NextResponse.json(
        { error: 'Failed to move card' },
        { status: 500 }
      );
    }

    // Log activity
    const details = `Moved from "${sourceList?.title}" to "${targetList?.title}"`;
    await logActivity(cardId, 'moved', userId, details);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}