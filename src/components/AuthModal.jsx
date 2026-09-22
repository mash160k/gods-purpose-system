import React from 'react';
import { FiX } from 'react-icons/fi';

export default function AuthModal({
  isOpen,
  onClose,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authError,
  setAuthError,
  authLoading,
  onSubmit,
  triggerHaptic
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="bg-[#161C24] text-white rounded-t-[2.2rem] p-6 border-t border-[#26313E] shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (triggerHaptic) triggerHaptic('light');
                setAuthMode('signin');
                setAuthError('');
              }}
              className={`text-sm font-sans font-bold pb-1 transition-all ${
                authMode === 'signin'
                  ? 'text-[#C6A87C] border-b-2 border-[#C6A87C]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                if (triggerHaptic) triggerHaptic('light');
                setAuthMode('signup');
                setAuthError('');
              }}
              className={`text-sm font-sans font-bold pb-1 transition-all ${
                authMode === 'signup'
                  ? 'text-[#C6A87C] border-b-2 border-[#C6A87C]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <FiX size={18} />
          </button>
        </div>

        {authError && (
          <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg p-2.5">
            {authError}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          {authMode === 'signup' && (
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                placeholder="e.g. Lisa"
                className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#0D1217] text-white outline-none focus:border-[#C6A87C]"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#0D1217] text-white outline-none focus:border-[#C6A87C]"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#0D1217] text-white outline-none focus:border-[#C6A87C]"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-2.5 mt-2 bg-[#C6A87C] hover:brightness-105 active:scale-95 text-[#14202E] font-bold text-xs rounded-xl transition-all shadow-md"
          >
            {authLoading
              ? 'Connecting...'
              : authMode === 'signin'
              ? 'Sign In & Restore'
              : 'Create & Protect Progress'}
          </button>
        </form>

        <div className="text-center pt-1">
          {authMode === 'signin' ? (
            <button
              type="button"
              onClick={() => {
                if (triggerHaptic) triggerHaptic('light');
                setAuthMode('signup');
                setAuthError('');
              }}
              className="text-[11px] text-gray-400 hover:text-[#C6A87C]"
            >
              Don't have an account yet?{' '}
              <span className="underline font-semibold text-[#C6A87C]">Create one</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (triggerHaptic) triggerHaptic('light');
                setAuthMode('signin');
                setAuthError('');
              }}
              className="text-[11px] text-gray-400 hover:text-[#C6A87C]"
            >
              Already have an account?{' '}
              <span className="underline font-semibold text-[#C6A87C]">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}