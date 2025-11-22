// API endpoint to toggle card completion
// app/api/boards/[id]/lists/[listId]/cards/[cardId]/complete/route.ts
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

    const { id: boardId, listId, cardId } = await params;
    const { completed } = await request.json();

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

    // Get card info
    const { data: card } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', cardId)
      .single();

    // Update card completion status
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ completed })
      .eq('id', cardId)
      .eq('sectional_column_id', listId);

    if (updateError) {
      console.error('Supabase error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update card' },
        { status: 500 }
      );
    }

    // Log activity
    const action = completed ? 'Marked as done' : 'Marked as incomplete';
    await logActivity(cardId, 'updated', userId, `${action}: "${card?.title}"`);

    return NextResponse.json({ success: true, completed });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}