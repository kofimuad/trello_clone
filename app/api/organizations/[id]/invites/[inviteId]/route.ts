// app/api/organizations/[id]/invites/[inviteId]/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: orgId, inviteId } = await params;
    console.log('Deleting invite:', { orgId, inviteId, userId });
    
    const supabase = await createClient();

    // Check if requester is owner
    const { data: requester, error: requesterError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (requesterError || !requester) {
      console.log('Requester check failed:', requesterError);
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    if (requester.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can cancel invites' },
        { status: 403 }
      );
    }

    // First, verify the invite exists
    const { data: inviteCheck, error: checkError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    console.log('Invite check:', { inviteCheck, checkError });

    // Delete invite - only by id
    const { data: deleteData, error: deleteError, count } = await supabase
      .from('organization_invites')
      .delete()
      .eq('id', inviteId)
      .select();

    console.log('Delete result:', { deleteData, deleteError, count });

    if (deleteError) {
      console.error('Supabase error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to cancel invite' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, deleted: count },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}