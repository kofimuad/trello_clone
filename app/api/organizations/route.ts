import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch user's organizations
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    console.log('userId from Clerk:', userId);
    
    if (!userId) {
      console.log('No userId found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Get all organizations where the user is a member
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        organizations!inner (
          id,
          name,
          created_by,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    // Extract organizations from the nested response
    const organizations = data.map(item => item.organizations);

    return NextResponse.json({
      organizations,
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

// POST - Create a new organization
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        created_by: userId,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Supabase error:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgData.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      console.error('Supabase member error:', memberError);
      return NextResponse.json(
        { error: 'Failed to add user to organization' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        organization: orgData,
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