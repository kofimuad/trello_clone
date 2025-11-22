// app/api/organizations/[id]/boards/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch all boards in organization
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

    const { id: orgId } = await params;
    const supabase = await createClient();

    // Check if user is member of organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Get all boards
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (boardsError) {
      console.error('Supabase error:', boardsError);
      return NextResponse.json(
        { error: 'Failed to fetch boards' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      boards,
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

// POST - Create a new board
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

    const { id: orgId } = await params;
    const { title, description, color } = await request.json();

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Board title is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is member of organization
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Create board
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .insert({
        title: title.trim(),
        description: description || null,
        color: color || '#3b82f6',
        user_id: userId,
        organization_id: orgId,
      })
      .select()
      .single();

    if (boardError) {
      console.error('Supabase error:', boardError);
      return NextResponse.json(
        { error: 'Failed to create board' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        board,
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