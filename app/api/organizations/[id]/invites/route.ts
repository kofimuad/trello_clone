// app/api/organizations/[id]/invites/route.ts
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// POST - Create and send an invite
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
    const { email, role = 'member' } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is owner of the organization
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

    if (member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can invite users' },
        { status: 403 }
      );
    }

    // Get organization name
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    // Check if user is already a member
    const { data: existingUser } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Generate unique invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        email: email.toLowerCase(),
        token,
        role,
        created_by: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Supabase error:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      );
    }

    // Send invite email
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL}/invite/${token}`;

    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: `You're invited to join ${organization?.name}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">You're invited to join ${organization?.name}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Someone has invited you to collaborate on <strong>${organization?.name}</strong>. 
              Click the button below to accept the invitation and start collaborating.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" style="display: inline-block; padding: 12px 30px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <a href="${inviteLink}" style="color: #3b82f6; word-break: break-all;">${inviteLink}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can ignore this email.
            </p>
          </div>
        `,
      });

      console.log('Email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the whole request if email fails, invite is still created
    }

    return NextResponse.json(
      {
        invite,
        inviteLink,
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

// GET - Fetch pending invites for an organization
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

    // Check if user is owner
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

    if (member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can view invites' },
        { status: 403 }
      );
    }

    // Get pending invites
    const { data: invites, error: invitesError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('organization_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (invitesError) {
      console.error('Supabase error:', invitesError);
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invites,
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