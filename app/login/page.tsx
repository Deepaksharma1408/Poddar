// Poddar International College - Institutional Login Gateway
// Split-screen composition: Genuine campus photo on left, refined white & gold panel on right.

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { PoddarCrest } from '@/components/brand-logo';

export default function LoginPage() {
  const router = useRouter();

  const [institutionalId, setInstitutionalId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Field validation
    if (!institutionalId.trim()) {
      setErrorMessage('Please enter your Institutional ID or registered Email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }

    setIsLoading(true);

    // Simulate authentic server verification
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMessage('Institutional identity verified. Redirecting to your workspace...');
      setTimeout(() => {
        router.push('/portal');
      }, 900);
    }, 1100);
  };

  return (
    <div className="pic-login-wrapper">
      {/* LEFT COLUMN: Genuine Campus Photograph & Institutional Identity */}
      <div className="pic-login-hero-side">
        <div className="pic-login-hero-bg">
          <img
            src="/images/poddar/campus-main.jpg"
            alt="Poddar International College Main Campus, Mansarovar, Jaipur"
          />
        </div>
        <div className="pic-login-hero-overlay" />

        {/* Top: Branding Header */}
        <div className="pic-login-hero-content">
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              color: '#ffffff',
            }}
          >
            <PoddarCrest size={44} light={true} />
            <div>
              <strong style={{ fontFamily: 'var(--pic-font-serif)', fontSize: '20px', letterSpacing: '0.5px' }}>
                PODDAR
              </strong>
              <span
                style={{
                  display: 'block',
                  fontSize: '9.5px',
                  letterSpacing: '2px',
                  color: '#C6A45A',
                  textTransform: 'uppercase',
                }}
              >
                INTERNATIONAL COLLEGE
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Quote */}
        <motion.div
          className="pic-login-quote"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              background: 'rgba(198, 164, 90, 0.15)',
              border: '1px solid rgba(198, 164, 90, 0.3)',
              borderRadius: '20px',
              fontSize: '10.5px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              color: '#C6A45A',
              marginBottom: '18px',
            }}
          >
            <Sparkles size={11} />
            <span>ESTD. 1998 · JAIPUR</span>
          </div>

          <blockquote>
            &ldquo;Nurturing intellectual depth, ethical character, and innovative leadership for an evolving world.&rdquo;
          </blockquote>

          <cite>Affiliated to University of Rajasthan · Approved by AICTE &amp; UGC</cite>
        </motion.div>

        {/* Bottom: Mandatory CC BY-SA 4.0 Attribution */}
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            fontSize: '10.5px',
            color: 'rgba(255, 255, 255, 0.5)',
            lineHeight: 1.5,
          }}
        >
          Campus photograph: Poddar International College via{' '}
          <a
            href="https://commons.wikimedia.org/wiki/File:Poddar_International_College_Campus.jpg"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#C6A45A' }}
          >
            Wikimedia Commons
          </a>{' '}
          (CC BY-SA 4.0).
        </div>
      </div>

      {/* RIGHT COLUMN: Clean White & Gold Login Panel */}
      <div className="pic-login-panel-side">
        <div className="pic-login-form-container">
          {/* Back link */}
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#64748b',
              fontSize: '12.5px',
              textDecoration: 'none',
              marginBottom: '28px',
              transition: 'color 0.18s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#0B1D3A')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            <ArrowLeft size={14} />
            <span>Back to Public Homepage</span>
          </Link>

          {/* Form Header */}
          <div className="pic-login-header">
            <div className="pic-login-crest-row">
              <PoddarCrest size={38} light={false} />
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#C6A45A', textTransform: 'uppercase' }}>
                  INSTITUTIONAL ACCESS
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0B1D3A' }}>
                  Poddar Connect Gateway
                </div>
              </div>
            </div>

            <h1>Sign In to Portal</h1>
            <p>
              Enter your institutional ID (e.g. <code>PIC26001</code>) or official email address to access your academic portal.
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  color: '#991b1b',
                  fontSize: '12.5px',
                  marginBottom: '20px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#edf7f1',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  color: '#15803d',
                  fontSize: '12.5px',
                  marginBottom: '20px',
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Field 1: Institutional ID / Email */}
            <div className="pic-form-group">
              <label htmlFor="institutionalId" className="pic-form-label">
                Institutional ID / Registered Email
              </label>
              <div className="pic-input-wrapper">
                <User size={16} className="pic-input-icon" />
                <input
                  id="institutionalId"
                  type="text"
                  className="pic-form-input"
                  placeholder="e.g. PIC26001 or name@poddarinstitute.org"
                  value={institutionalId}
                  onChange={e => setInstitutionalId(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div className="pic-form-group">
              <label htmlFor="password" className="pic-form-label">
                Account Password
              </label>
              <div className="pic-input-wrapper">
                <Lock size={16} className="pic-input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="pic-form-input"
                  style={{ paddingRight: '40px' }}
                  placeholder="Enter your confidential password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="pic-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div className="pic-form-options">
              <label className="pic-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#C6A45A' }}
                />
                <span>Remember this device</span>
              </label>

              <button
                type="button"
                className="pic-forgot-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => setForgotModalOpen(true)}
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="pic-btn-login"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <span>Authenticating Identity...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>
          </form>

          {/* Quick Demo Access Bar */}
          <div
            style={{
              marginTop: '18px',
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '6px',
              fontSize: '11.5px',
              color: '#64748b',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>
                Demo ID: <strong style={{ color: '#0B1D3A' }}>PIC26001</strong> | Password: <strong style={{ color: '#0B1D3A' }}>poddar2026</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setInstitutionalId('PIC26001');
                  setPassword('poddar2026');
                }}
                style={{
                  background: '#0B1D3A',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Auto-fill
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
              <span>Direct Portals:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link
                  href="/portal"
                  style={{ color: '#0B1D3A', fontWeight: 700, textDecoration: 'underline' }}
                >
                  ERP Portal
                </Link>
                <span>·</span>
                <Link
                  href="/finance"
                  style={{ color: '#C6A45A', fontWeight: 700, textDecoration: 'underline' }}
                >
                  Finance Portal
                </Link>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="pic-login-security-badge">
            <ShieldCheck size={16} />
            <span>256-Bit SSL Encrypted Institutional Gateway</span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {forgotModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2000,
              background: 'rgba(7, 20, 38, 0.75)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '32px',
                maxWidth: '440px',
                width: '100%',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#0B1D3A', marginBottom: '14px' }}>
                <KeyRound size={22} style={{ color: '#C6A45A' }} />
                <h3 style={{ margin: 0, fontFamily: 'var(--pic-font-serif)', fontSize: '20px' }}>
                  Institutional Password Recovery
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>
                Password recovery requests are audited for security. Please contact the Poddar IT Administration Desk
                at <strong>admin@poddarinstitute.org</strong> or visit the Registrar Office with your institutional identity card.
              </p>
              <button
                type="button"
                className="pic-btn-login"
                onClick={() => setForgotModalOpen(false)}
                style={{ height: '42px', fontSize: '12px' }}
              >
                Understood &amp; Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

