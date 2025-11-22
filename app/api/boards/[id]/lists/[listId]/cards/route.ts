// app/api/boards/[id]/lists/[listId]/cards/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLogger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: boardId, listId } = await params;
    const { title, description, priority, due_date } = await request.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Card title is required' },
        { status: 400 }
      );
    }

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

    // Get highest sort_order for this list
    const { data: lastCard } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('sectional_column_id', listId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastCard?.sort_order || 0) + 1;

    // Create card
    const { data: card, error: cardError } = await supabase
      .from('tasks')
      .insert({
        sectional_column_id: listId,
        title: title.trim(),
        description: description || null,
        priority: priority || 'medium',
        due_date: due_date || null,
        sort_order: sortOrder,
        created_by: userId,
      })
      .select()
      .single();

    if (cardError) {
      console.error('Supabase error:', cardError);
      return NextResponse.json(
        { error: 'Failed to create card' },
        { status: 500 }
      );
    }

    // Log activity
    await logActivity(card.id, 'created', userId, `Card created: "${title}"`);

    return NextResponse.json(
      {
        card,
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}