import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { ArrowLeft, FileText } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ChangelogManager from './ChangelogManager';

export default async function AdminChangelogPage() {
  const session = await getSession();

  // Head Admin only
  if (!session || session.adminLevel !== 1337) {
    redirect('/dashboard/admin');
  }

  return (
    <div className="min-h-screen bg-[#09090b] pt-20 pb-12">
      <Navbar session={{ username: session.username, email: '' }} />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-3xl">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6">
          <Link
            href="/dashboard/admin"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin Portal
          </Link>
          <span className="text-zinc-650 text-xs">/</span>
          <span className="text-xs text-zinc-500 font-medium font-bold">Changelog</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-amber-500" />
            Changelog Manager
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Publish server updates. Entries appear in-game via /changelog and on
            the public changelog page instantly.
          </p>
        </div>

        <ChangelogManager />
      </main>
    </div>
  );
}
