// College Finance Portal - Accessible Modal Dialog Component
// Implements React Portal, Escape dismiss, focus trapping, and smooth viewport scrolling.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '540px',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    // Capture the element focused BEFORE opening dialog
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Lock body scroll to prevent parent page from scrolling behind modal
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key & Focus trap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }

      // Focus trap within modal
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      // Restore focus only when dialog actually unmounts or closes
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(5, 51, 92, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start', // Anchored at top of viewport so never pushed to bottom
        justifyContent: 'center',
        padding: '24px 16px 48px',
        overflowY: 'auto', // Entire backdrop scrolls effortlessly if screen is short
        WebkitOverflowScrolling: 'touch',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(7, 20, 38, 0.35), 0 0 0 1px rgba(7, 20, 38, 0.1)',
          border: '1px solid #cbd5e1',
          width: '100%',
          maxWidth,
          display: 'flex',
          flexDirection: 'column',
          margin: '0 auto', // Centered horizontally with 0 top margin
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            backgroundColor: '#f8fafc',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}
        >
          <div>
            <h2
              id="dialog-title"
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#0B1D3A',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', margin: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              color: '#64748b',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '18px 20px' }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
