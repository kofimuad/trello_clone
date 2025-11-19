// app/invite/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/navbar';

export default function AcceptInvitePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      // Redirect to sign in with return URL
      router.push(`/sign-in?redirect_url=/invite/${token}`);
      return;
    }

    acceptInvite();
  }, [isLoaded, user, token, router]);

  const acceptInvite = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/invites/${token}/accept`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      setSuccess('Successfully joined the organization!');

      // Redirect to organization after 2 seconds
      setTimeout(() => {
        router.push(`/org/${data.organization_id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-[calc(100vh-60px)]">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex justify-center items-center min-h-[calc(100vh-60px)]">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md mx-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Join Organization</h1>

          {loading && (
            <div className="text-center">
              <p className="text-gray-600 mb-4">Processing your invite...</p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-4">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                Back to Dashboard
              </button>
            </div>
          )}

          {success && !loading && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">{success}</p>
              <p className="text-green-700 text-sm mt-2">Redirecting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}