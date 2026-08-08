import { redirect } from 'next/navigation';
import Link from 'next/link';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';
import { ArrowLeft, Shield, Home } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AdminMappingPanel from './AdminMappingPanel';

async function getPendingMappings() {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, ucp_name, property_type, property_id, mapping_code, created_at, custom_title 
       FROM property_mappings 
       WHERE status = 0 
       ORDER BY created_at ASC`
    );
    return rows;
  } catch (error) {
    console.error('Error fetching pending mappings for admin:', error);
    return [];
  }
}

async function getUserEmail(username: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT Email FROM accounts WHERE Username = ? LIMIT 1',
      [username]
    );
    return rows[0]?.Email || '';
  } catch {
    return '';
  }
}

export default async function AdminMappingPortalPage() {
  const session = await getSession();

  if (!session || session.adminLevel <= 0) {
    redirect('/dashboard');
  }

  const email = await getUserEmail(session.username);
  const pendingMappings = await getPendingMappings();

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={session ? { username: session.username, email } : null} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <span className="text-zinc-700 text-xs">/</span>
          <Link
            href="/dashboard/admin"
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            Admin Portal
          </Link>
          <span className="text-zinc-700 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium">Review Mapping</span>
        </div>

        {/* Heading */}
        <div className="mb-8 font-sans">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-amber-500" />
            Property Mapping Review
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Review submitted player property mapping codes, approve valid submissions, or reject with notes.
          </p>
        </div>

        {/* Admin Mapping Review List */}
        <AdminMappingPanel initialRequests={pendingMappings as any[]} />
      </main>
    </div>
  );
}
