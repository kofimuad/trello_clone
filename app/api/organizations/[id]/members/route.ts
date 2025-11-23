// app/api/organizations/[id]/members/route.ts
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // Check if user is a member
    const { data: userMember, error: userMemberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (userMemberError || !userMember) {
      return NextResponse.json(
        { error: 'You are not a member of this organization' },
        { status: 403 }
      );
    }

    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Supabase error:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // Fetch user details from Clerk for each member
    const clerk = await clerkClient();
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        try {
          const user = await clerk.users.getUser(member.user_id);
          return {
            ...member,
            userName: user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user.emailAddresses[0]?.emailAddress || member.user_id,
            userEmail: user.emailAddresses[0]?.emailAddress,
          };
        } catch (err) {
          // If we can't fetch from Clerk, return the ID
          return {
            ...member,
            userName: member.user_id,
            userEmail: null,
          };
        }
      })
    );

    return NextResponse.json({
      members: membersWithDetails,
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