import type { Metadata, Viewport } from 'next';
import './globals.css';
import './premium.css';
import './responsive.css';
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content', themeColor: '#102d47' };
export const metadata: Metadata = { title: 'Poddar Connect | School Management', description: 'Poddar International School administration prototype — Mansarovar, Jaipur.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
