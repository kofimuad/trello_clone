// app/api/boards/[id]/lists/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch all lists in board with cards
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: boardId } = await params;
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

    // Get lists with cards
    const { data: lists, error: listsError } = await supabase
      .from('sectional_columns')
      .select(`
        *,
        tasks (*)
      `)
      .eq('board_id', boardId)
      .order('sort_order', { ascending: true });

    if (listsError) {
      console.error('Supabase error:', listsError);
      return NextResponse.json(
        { error: 'Failed to fetch lists' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      lists,
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

// POST - Create a new list
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: boardId } = await params;
    const { title } = await request.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'List title is required' },
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

    // Get the highest sort_order
    const { data: lastList } = await supabase
      .from('sectional_columns')
      .select('sort_order')
      .eq('board_id', boardId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (lastList?.sort_order || 0) + 1;

    // Create list
    const { data: list, error: listError } = await supabase
      .from('sectional_columns')
      .insert({
        board_id: boardId,
        title: title.trim(),
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (listError) {
      console.error('Supabase error:', listError);
      return NextResponse.json(
        { error: 'Failed to create list' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        list,
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