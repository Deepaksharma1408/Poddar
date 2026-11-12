'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Wallet, ChevronDown, Check } from 'lucide-react';

export type Workspace = 'college' | 'finance';

interface WorkspaceSwitcherProps {
  current: Workspace;
  compact?: boolean;
  onSelect?: (workspace: Workspace) => void;
}

const WORKSPACES = [
  {
    id: 'college' as Workspace,
    name: 'College Management',
    subtitle: 'Mansarovar Campus, Jaipur',
    path: '/',
    icon: Building2,
  },
  {
    id: 'finance' as Workspace,
    name: 'Finance',
    subtitle: 'Accounts, payroll and expenditure',
    path: '/finance/dashboard',
    icon: Wallet,
  },
];

export default function WorkspaceSwitcher({
  current,
  compact = false,
  onSelect,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = WORKSPACES.find(w => w.id === current) ?? WORKSPACES[0];
  const ActiveIcon = activeWorkspace.icon;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (workspace: typeof WORKSPACES[number]) => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('poddar-active-workspace', workspace.id);
        localStorage.setItem('poddar-institution', workspace.id);
      } catch {
        // Safe localStorage write
      }
    }

    if (onSelect) {
      onSelect(workspace.id);
    }

    if (workspace.id !== current) {
      router.push(workspace.path);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', marginBottom: '14px' }}>
      <button
        type="button"
        className="workspace-switch"
        aria-expanded={isOpen}
        aria-label="Switch workspace"
        onClick={() => setIsOpen(prev => !prev)}
        data-tooltip={compact ? activeWorkspace.name : undefined}
        title={compact ? `${activeWorkspace.name} — ${activeWorkspace.subtitle}` : undefined}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: compact ? '8px 4px' : '10px 10px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '7px',
          color: '#ffffff',
          cursor: 'pointer',
          textAlign: 'left',
          boxSizing: 'border-box',
          transition: 'background 0.15s ease',
        }}
      >
        <span
          className="campus-icon"
          style={{
            width: '32px',
            height: '32px',
            display: 'grid',
            placeItems: 'center',
            borderRadius: '6px',
            backgroundColor: current === 'finance' ? 'rgba(180, 150, 98, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: current === 'finance' ? '#e0cfac' : '#c4ae82',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
          }}
        >
          <ActiveIcon size={17} />
        </span>

        {!compact && (
          <>
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: '#f0f1f1',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeWorkspace.name}
              </strong>
              <small
                style={{
                  display: 'block',
                  color: '#879db0',
                  fontSize: '10px',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeWorkspace.subtitle}
              </small>
            </span>
            <ChevronDown
              size={14}
              style={{
                color: '#8299ac',
                transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(180deg)' : 'none',
                flexShrink: 0,
              }}
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Available workspaces"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: compact ? '220px' : '100%',
            backgroundColor: '#0c2338',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            padding: '6px',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontSize: '8.5px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: '#879db0',
              padding: '6px 8px 4px',
            }}
          >
            Switch Workspace
          </div>

          {WORKSPACES.map(ws => {
            const isSelected = ws.id === current;
            const Icon = ws.icon;
            return (
              <button
                key={ws.id}
                role="menuitem"
                type="button"
                onClick={() => handleSelect(ws)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(180, 150, 98, 0.18)' : 'transparent',
                  border: isSelected ? '1px solid rgba(196, 171, 119, 0.35)' : '1px solid transparent',
                  color: isSelected ? '#eadbc0' : '#a0b1c0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '5px',
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: isSelected ? 'rgba(196, 171, 119, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    color: isSelected ? '#f5ebd7' : '#8fa4b5',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                    }}
                  >
                    {ws.name}
                  </strong>
                  <small
                    style={{
                      display: 'block',
                      fontSize: '9.5px',
                      color: isSelected ? '#c4ae82' : '#7891a6',
                      marginTop: '1px',
                    }}
                  >
                    {ws.subtitle}
                  </small>
                </span>
                {isSelected && <Check size={14} style={{ color: '#c4ab77', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

