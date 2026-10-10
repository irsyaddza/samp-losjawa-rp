'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Mail, Key, Eye, EyeOff, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';

interface SettingsFormProps {
  initialEmail: string;
  initialSecretWord: string;
  initialSecretHint: string;
}

export default function SettingsForm({
  initialEmail,
  initialSecretWord,
  initialSecretHint,
}: SettingsFormProps) {
  const router = useRouter();

  // Email form
  const [email, setEmail] = useState(initialEmail);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Security Word form
  const [secretWord, setSecretWord] = useState(initialSecretWord);
  const [secretHint, setSecretHint] = useState(initialSecretHint);
  const [secSuccess, setSecSuccess] = useState('');
  const [secError, setSecError] = useState('');
  const [secLoading, setSecLoading] = useState(false);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    setEmailLoading(true);

    try {
      const res = await fetch('/api/user/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || 'Failed to update email');
      } else {
        setEmailSuccess('Recovery email updated successfully');
        router.refresh();
      }
    } catch {
      setEmailError('Network connection error');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('Password confirmation does not match');
      return;
    }

    setPassLoading(true);

    try {
      const res = await fetch('/api/user/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPassError(data.error || 'Failed to update password');
      } else {
        setPassSuccess('Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setPassError('Network connection error');
    } finally {
      setPassLoading(false);
    }
  };

  const handleSecurityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    setSecSuccess('');
    setSecLoading(true);

    try {
      const res = await fetch('/api/user/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretWord, secretHint }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSecError(data.error || 'Failed to update security credentials');
      } else {
        setSecSuccess('Security credentials updated successfully');
        router.refresh();
      }
    } catch {
      setSecError('Network connection error');
    } finally {
      setSecLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column: Email & Security Word */}
      <div className="space-y-8">
        {/* Email Settings Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 relative">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-amber-500" />
            Recovery Email
          </h3>
          <p className="text-xs text-zinc-400 mb-6">
            This email address is used if you forget your UCP account password.
          </p>

          {emailSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400 font-medium mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {emailError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-500 font-medium mb-4">
              <ShieldAlert className="h-4 w-4" />
              <span>{emailError}</span>
            </div>
          )}

          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="email-input">
                Email Address
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter new recovery email"
                className="w-full h-11 border border-zinc-805 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition border-zinc-800"
              />
            </div>
            <button
              type="submit"
              disabled={emailLoading}
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Email'}
            </button>
          </form>
        </div>

        {/* Security Word Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 relative">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Secret Word Security
          </h3>
          <p className="text-xs text-zinc-400 mb-6">
            An extra layer of in-game security when your account logs in from a new IP or location.
          </p>

          {secSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400 font-medium mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>{secSuccess}</span>
            </div>
          )}

          {secError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-500 font-medium mb-4">
              <ShieldAlert className="h-4 w-4" />
              <span>{secError}</span>
            </div>
          )}

          <form onSubmit={handleSecurityUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="sec-word">
                Secret Word
              </label>
              <input
                id="sec-word"
                type="text"
                required
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                placeholder="Enter new security word"
                className="w-full h-11 border border-zinc-805 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition border-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="sec-hint">
                Hint Question / Prompt
              </label>
              <input
                id="sec-hint"
                type="text"
                value={secretHint}
                onChange={(e) => setSecretHint(e.target.value)}
                placeholder="e.g. Name of my first pet"
                className="w-full h-11 border border-zinc-805 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition border-zinc-800"
              />
            </div>
            <button
              type="submit"
              disabled={secLoading}
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {secLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Security Word'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Password Update */}
      <div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 relative h-full">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-500" />
            Change Password
          </h3>
          <p className="text-xs text-zinc-400 mb-6">
            Update your password periodically to keep your account safe.
          </p>

          {passSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-green-400 font-medium mb-4">
              <CheckCircle className="h-4 w-4" />
              <span>{passSuccess}</span>
            </div>
          )}

          {passError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-500 font-medium mb-4">
              <ShieldAlert className="h-4 w-4" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="old-pass">
                Current Password
              </label>
              <input
                id="old-pass"
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full h-11 border border-zinc-805 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition border-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="new-pass">
                New Password
              </label>
              <input
                id="new-pass"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full h-11 border border-zinc-805 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition border-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="confirm-pass">
                Confirm New Password
              </label>
              <input
                id="confirm-pass"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full h-11 border border-zinc-805 rounded-xl px-4 text-xs font-medium focus:border-amber-500 focus:outline-none bg-zinc-900 text-white transition border-zinc-800"
              />
            </div>
            <button
              type="submit"
              disabled={passLoading}
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {passLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
