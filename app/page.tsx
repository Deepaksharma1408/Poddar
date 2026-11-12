// Poddar International College, Jaipur - Premium Public Homepage
// Genuine institutional assets, editorial academic typography, strict Navy/Gold palette, and Framer Motion animations.

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Award,
  BookOpen,
  Building2,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { PoddarCrest } from '@/components/brand-logo';

export default function PoddarPublicHomepage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="poddar-public-body">
      {/* 1. TOP NAVIGATION BAR */}
      <motion.header
        className={`pic-navbar ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <Link href="/" className="pic-nav-brand">
          <PoddarCrest size={40} light={true} />
          <div className="pic-nav-brand-title">
            <strong>PODDAR</strong>
            <span>INTERNATIONAL COLLEGE</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <ul className="pic-nav-links">
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#academics">Academics</a>
          </li>
          <li>
            <a href="#highlights">Excellence</a>
          </li>
          <li>
            <a href="#campus-life">Campus Life</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
        </ul>

        {/* Action: Portal Login */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link href="/login" className="pic-btn-gold">
            <span>Portal Login</span>
            <ArrowRight size={14} />
          </Link>

          {/* Mobile hamburger button */}
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '6px',
            }}
            className="pic-mobile-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '72px',
              left: 0,
              right: 0,
              background: 'rgba(7, 20, 38, 0.98)',
              borderBottom: '1px solid rgba(198, 164, 90, 0.3)',
              padding: '24px',
              zIndex: 999,
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#ffffff', textDecoration: 'none', fontSize: '15px' }}
            >
              About
            </a>
            <a
              href="#academics"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#ffffff', textDecoration: 'none', fontSize: '15px' }}
            >
              Academics
            </a>
            <a
              href="#highlights"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#ffffff', textDecoration: 'none', fontSize: '15px' }}
            >
              Excellence
            </a>
            <a
              href="#campus-life"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#ffffff', textDecoration: 'none', fontSize: '15px' }}
            >
              Campus Life
            </a>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: '#ffffff', textDecoration: 'none', fontSize: '15px' }}
            >
              Contact
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="pic-btn-gold"
              style={{ marginTop: '8px', textAlign: 'center' }}
            >
              Portal Login
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. CINEMATIC HERO SECTION */}
      <section className="pic-hero">
        <div className="pic-hero-bg">
          <img
            src="/images/poddar/campus-main.jpg"
            alt="Poddar International College Main Campus, Mansarovar, Jaipur"
          />
        </div>
        <div className="pic-hero-overlay" />

        <motion.div
          className="pic-hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
        >
          <div className="pic-hero-badge">
            <Sparkles size={12} />
            <span>ESTABLISHED 1998 · JAIPUR, RAJASTHAN</span>
          </div>

          <h1 className="pic-hero-title">
            Shape Your Future. <br />
            <em>Create Your Legacy.</em>
          </h1>

          <p className="pic-hero-subtitle">
            Poddar International College stands at the forefront of premier collegiate education in Jaipur —
            fostering academic rigor, experiential research, and ethical leadership under the University of Rajasthan.
          </p>

          <div className="pic-hero-actions">
            <a href="#academics" className="pic-btn-gold">
              <span>Explore Programmes</span>
              <ArrowRight size={14} />
            </a>
            <a href="#campus-life" className="pic-btn-outline">
              <span>Campus Experience</span>
            </a>
            <Link href="/login" className="pic-btn-outline" style={{ borderColor: 'rgba(198, 164, 90, 0.5)' }}>
              <span>Institutional Sign In</span>
            </Link>
          </div>
        </motion.div>

        {/* Mandatory CC BY-SA 4.0 Wikimedia Commons Attribution */}
        <div className="pic-hero-attribution">
          Photo: Poddar International College /{' '}
          <a
            href="https://commons.wikimedia.org/wiki/File:Poddar_International_College_Campus.jpg"
            target="_blank"
            rel="noreferrer"
          >
            Wikimedia Commons
          </a>{' '}
          (CC BY-SA 4.0)
        </div>
      </section>

      {/* 3. VERIFIED TRUST & ACCREDITATION BANNER */}
      <section className="pic-trust-banner">
        <div className="pic-trust-grid">
          <motion.div
            className="pic-trust-item"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="pic-trust-value">1998</div>
            <div className="pic-trust-label">FOUNDED</div>
            <div className="pic-trust-sub">28+ Years of Academic Heritage</div>
          </motion.div>

          <motion.div
            className="pic-trust-item"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="pic-trust-value">UNIV. OF RAJASTHAN</div>
            <div className="pic-trust-label">PERMANENT AFFILIATION</div>
            <div className="pic-trust-sub">State University Curriculum Standards</div>
          </motion.div>

          <motion.div
            className="pic-trust-item"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="pic-trust-value">AICTE &amp; UGC</div>
            <div className="pic-trust-label">CENTRAL RECOGNITION</div>
            <div className="pic-trust-sub">Government Approved Technical Programs</div>
          </motion.div>

          <motion.div
            className="pic-trust-item"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="pic-trust-value">NAAC ACCREDITED</div>
            <div className="pic-trust-label">QUALITY ASSURED</div>
            <div className="pic-trust-sub">National Assessment Accreditation</div>
          </motion.div>
        </div>
      </section>

      {/* 4. INSTITUTIONAL HIGHLIGHTS */}
      <section className="pic-section pic-section-dark" id="highlights">
        <div className="pic-section-header">
          <span className="pic-section-eyebrow">FOUR PILLARS OF DISTINCTION</span>
          <h2 className="pic-section-title">An Education Defined by Excellence</h2>
          <div className="pic-gold-divider center" />
          <p className="pic-section-subtitle">
            Our collegiate architecture harmonizes scholarly depth, laboratory experimentation, and industry immersion
            to empower graduates for a complex, interconnected global economy.
          </p>
        </div>

        <div className="pic-highlights-grid">
          <motion.div
            className="pic-highlight-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="pic-highlight-icon">
              <BookOpen size={24} />
            </div>
            <h3>Academic Excellence</h3>
            <p>
              Undergraduate and postgraduate degrees taught by distinguished faculty, combining theoretical rigor
              with continuous university assessment and research mentoring.
            </p>
          </motion.div>

          <motion.div
            className="pic-highlight-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="pic-highlight-icon">
              <Compass size={24} />
            </div>
            <h3>Experiential Learning</h3>
            <p>
              Dedicated science and computing research laboratories equipped with advanced instrumentation, bioinformatics
              tools, and collaborative coding sandboxes.
            </p>
          </motion.div>

          <motion.div
            className="pic-highlight-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="pic-highlight-icon">
              <Users size={24} />
            </div>
            <h3>Campus Life &amp; Arts</h3>
            <p>
              A dynamic institutional culture featuring student councils, international conferences, cultural symposia,
              annual sports meets, and national tech hackathons.
            </p>
          </motion.div>

          <motion.div
            className="pic-highlight-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="pic-highlight-icon">
              <Building2 size={24} />
            </div>
            <h3>Industry Exposure</h3>
            <p>
              Active corporate recruitment cell, guest seminars with Fortune 500 executives, entrepreneurship incubation,
              and structured internships across national hubs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* 5. ABOUT PODDAR (EDITORIAL SECTION) */}
      <section className="pic-section pic-section-light" id="about">
        <div className="pic-about-container">
          {/* Images */}
          <motion.div
            className="pic-about-image-stack"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <img
              src="/images/poddar/campus-gallery-01.jpg"
              alt="Poddar International College Academic Campus"
              className="pic-about-img-primary"
            />
            <img
              src="/images/poddar/students-campus.jpg"
              alt="Poddar Students on Campus"
              className="pic-about-img-secondary"
            />
            <div className="pic-about-badge">
              <strong>28+</strong>
              <span>Years of Trust</span>
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            className="pic-about-content"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="pic-section-eyebrow">ABOUT PODDAR INTERNATIONAL COLLEGE</span>
            <h2>A Sanctuary of Intellectual Rigor &amp; Purpose</h2>
            <div className="pic-gold-divider" />
            <p>
              Located in the educational epicenter of Mansarovar, Jaipur, Poddar International College has evolved
              into a benchmark institution for higher learning in Rajasthan. Founded with the conviction that education
              must transcend rote instruction, we cultivate critical thinkers and responsible citizens.
            </p>
            <p>
              Our expansive academic infrastructure features digital smart classrooms, an expansive automated library
              holding thousands of scholarly journals, specialized computer programming facilities, and advanced
              biological sciences laboratories.
            </p>

            <div className="pic-about-features">
              <div className="pic-about-feature-item">
                <CheckCircle2 size={16} />
                <span>UGC &amp; AICTE Approved</span>
              </div>
              <div className="pic-about-feature-item">
                <CheckCircle2 size={16} />
                <span>NAAC Accredited Institution</span>
              </div>
              <div className="pic-about-feature-item">
                <CheckCircle2 size={16} />
                <span>University of Rajasthan Syllabus</span>
              </div>
              <div className="pic-about-feature-item">
                <CheckCircle2 size={16} />
                <span>Mansarovar Sector-7 Prime Campus</span>
              </div>
            </div>

            <a href="#contact" className="pic-btn-gold" style={{ marginTop: '10px' }}>
              <span>Connect with Admissions</span>
              <ArrowRight size={14} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* 6. ACADEMIC PROGRAMMES */}
      <section className="pic-section pic-section-dark" id="academics">
        <div className="pic-section-header">
          <span className="pic-section-eyebrow">DEGREE FACULTIES &amp; SPECIALIZATIONS</span>
          <h2 className="pic-section-title">Academic Architecture</h2>
          <div className="pic-gold-divider center" />
          <p className="pic-section-subtitle">
            Explore diverse undergraduate and postgraduate programs accredited and affiliated with the University of Rajasthan.
          </p>
        </div>

        <div className="pic-academics-grid">
          {/* Faculty 1 */}
          <motion.div
            className="pic-faculty-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="pic-faculty-card-header">
              <span className="pic-faculty-badge">DEPARTMENT OF COMPUTING</span>
              <h3>Information Technology</h3>
            </div>
            <div className="pic-faculty-card-body">
              <ul className="pic-programme-list">
                <li>
                  <span>Bachelor of Computer Applications (BCA)</span>
                  <span>3 Years</span>
                </li>
                <li>
                  <span>Master of Computer Applications (MCA)</span>
                  <span>2 Years</span>
                </li>
                <li>
                  <span>B.Sc Information Technology</span>
                  <span>3 Years</span>
                </li>
                <li>
                  <span>Artificial Intelligence &amp; Cloud Labs</span>
                  <span>Elective</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Faculty 2 */}
          <motion.div
            className="pic-faculty-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="pic-faculty-card-header">
              <span className="pic-faculty-badge">DEPARTMENT OF COMMERCE</span>
              <h3>Management &amp; Finance</h3>
            </div>
            <div className="pic-faculty-card-body">
              <ul className="pic-programme-list">
                <li>
                  <span>Bachelor of Business Administration (BBA)</span>
                  <span>3 Years</span>
                </li>
                <li>
                  <span>Bachelor of Commerce (B.Com Pass &amp; Hons)</span>
                  <span>3 Years</span>
                </li>
                <li>
                  <span>Master of Business Administration (MBA)</span>
                  <span>2 Years</span>
                </li>
                <li>
                  <span>M.Com (ABST / EAFM / Business Admin)</span>
                  <span>2 Years</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Faculty 3 */}
          <motion.div
            className="pic-faculty-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="pic-faculty-card-header">
              <span className="pic-faculty-badge">DEPARTMENT OF SCIENCES</span>
              <h3>Basic &amp; Applied Sciences</h3>
            </div>
            <div className="pic-faculty-card-body">
              <ul className="pic-programme-list">
                <li>
                  <span>B.Sc Biology (CBZ / Biotech)</span>
                  <span>3 Years</span>
                </li>
                <li>
                  <span>B.Sc Mathematics (PCM / Stats)</span>
                  <span>3 Years</span>
                </li>
                <li>
                  <span>M.Sc Chemistry / Botany / Zoology</span>
                  <span>2 Years</span>
                </li>
                <li>
                  <span>M.Sc Mathematics / Physics</span>
                  <span>2 Years</span>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Faculty 4 */}
          <motion.div
            className="pic-faculty-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="pic-faculty-card-header">
              <span className="pic-faculty-badge">DEPARTMENT OF HUMANITIES</span>
              <h3>Arts &amp; Social Sciences</h3>
            </div>
            <div className="pic-faculty-card-body">
              <ul className="pic-programme-list">
                <li>
                  <span>Bachelor of Arts (B.A. Honors &amp; Pass)</span>
                  <span>3 Years</span>
                </li>
                <li>
                  <span>M.A. English Literature</span>
                  <span>2 Years</span>
                </li>
                <li>
                  <span>M.A. Economics / Political Science</span>
                  <span>2 Years</span>
                </li>
                <li>
                  <span>Journalism &amp; Mass Media Electives</span>
                  <span>Diploma</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 7. CAMPUS EXPERIENCE & GALLERY */}
      <section className="pic-section pic-section-dark" id="campus-life" style={{ backgroundColor: '#071426' }}>
        <div className="pic-section-header">
          <span className="pic-section-eyebrow">CAMPUS EXPERIENCE</span>
          <h2 className="pic-section-title">Life at Poddar International College</h2>
          <div className="pic-gold-divider center" />
          <p className="pic-section-subtitle">
            Authentic moments of scholarship, laboratory research, and cultural vibrancy captured on our Jaipur campus.
          </p>
        </div>

        <div className="pic-gallery-grid">
          <motion.div
            className="pic-gallery-item pic-col-8"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img src="/images/poddar/campus-gallery-02.jpg" alt="Poddar Campus Infrastructure" />
            <div className="pic-gallery-caption">
              <strong>Collegiate Architecture &amp; Auditoria</strong>
              <small>Mansarovar Sector-7 Campus Wing</small>
            </div>
          </motion.div>

          <motion.div
            className="pic-gallery-item pic-col-4"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <img src="/images/poddar/academic-lab.jpg" alt="Scientific Research Laboratory" />
            <div className="pic-gallery-caption">
              <strong>Science &amp; Computing Laboratories</strong>
              <small>Practical Experimentation Desks</small>
            </div>
          </motion.div>

          <motion.div
            className="pic-gallery-item pic-col-6"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <img src="/images/poddar/campus-life-01.jpg" alt="Poddar Cultural Symposium" />
            <div className="pic-gallery-caption">
              <strong>Academic Symposia &amp; Seminars</strong>
              <small>Student Leadership Dialogues</small>
            </div>
          </motion.div>

          <motion.div
            className="pic-gallery-item pic-col-6"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <img src="/images/poddar/campus-life-02.jpg" alt="Central Library and Research" />
            <div className="pic-gallery-caption">
              <strong>Central Library &amp; Reading Desks</strong>
              <small>Extensive National &amp; International Volumes</small>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 8. INSTITUTIONAL CONTACT & LOCATION */}
      <section className="pic-section pic-section-light" id="contact">
        <div className="pic-about-container">
          <div>
            <span className="pic-section-eyebrow">INSTITUTIONAL ENQUIRY</span>
            <h2 style={{ fontFamily: 'var(--pic-font-serif)', color: '#071426', fontSize: '38px', margin: '0 0 16px' }}>
              Begin Your Journey with Poddar
            </h2>
            <div className="pic-gold-divider" />
            <p style={{ color: '#3A4B60', fontSize: '15px', lineHeight: 1.8 }}>
              Prospective students, guardians, and academic partners are invited to contact the Admissions Desk
              or schedule a personalized campus walkthrough at our Mansarovar campus.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <MapPin size={20} style={{ color: '#C6A45A', marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', color: '#071426', fontSize: '14px' }}>Campus Address</strong>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                    Sector-7, Near Shipra Path, Mansarovar, Jaipur, Rajasthan 302020
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Phone size={20} style={{ color: '#C6A45A', marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', color: '#071426', fontSize: '14px' }}>Admission Helplines</strong>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>+91-9694875297 / +91-7023652996</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Mail size={20} style={{ color: '#C6A45A', marginTop: '3px', flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', color: '#071426', fontSize: '14px' }}>Official Email</strong>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>admission@poddarinstitute.org</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Connect Card */}
          <div
            style={{
              background: '#071426',
              padding: '36px',
              borderRadius: '8px',
              border: '1px solid rgba(198, 164, 90, 0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--pic-font-serif)', color: '#ffffff', fontSize: '24px', margin: '0 0 8px' }}>
              Institutional Portal Access
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13.5px', marginBottom: '24px' }}>
              Enrolled students, faculty members, and administrative officers can access their institutional accounts via the secure gateway.
            </p>
            <Link
              href="/login"
              className="pic-btn-gold"
              style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center' }}
            >
              <span>Go to Institutional Login</span>
              <ArrowRight size={14} />
            </Link>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <ShieldCheck size={14} style={{ color: '#C6A45A' }} />
              <span>256-Bit SSL Encrypted Institutional Gateway</span>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="pic-footer">
        <div className="pic-footer-top">
          {/* Brand Col */}
          <div className="pic-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PoddarCrest size={32} light={true} />
              <strong style={{ fontFamily: 'var(--pic-font-serif)', fontSize: '18px', color: '#ffffff' }}>
                PODDAR INTERNATIONAL COLLEGE
              </strong>
            </div>
            <p>
              Premier collegiate institution in Jaipur, Rajasthan. Affiliated with the University of Rajasthan, approved
              by AICTE, and recognized by UGC.
            </p>
          </div>

          {/* Quick Links */}
          <div className="pic-footer-col">
            <h5>Navigation</h5>
            <ul>
              <li>
                <a href="#about">About Institution</a>
              </li>
              <li>
                <a href="#academics">Degree Programmes</a>
              </li>
              <li>
                <a href="#highlights">Academic Excellence</a>
              </li>
              <li>
                <a href="#campus-life">Campus Experience</a>
              </li>
              <li>
                <Link href="/login">Portal Login</Link>
              </li>
            </ul>
          </div>

          {/* Faculties */}
          <div className="pic-footer-col">
            <h5>Faculties</h5>
            <ul>
              <li>Computer Applications</li>
              <li>Business Administration</li>
              <li>Commerce &amp; Finance</li>
              <li>Applied Sciences</li>
              <li>Arts &amp; Humanities</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="pic-footer-col">
            <h5>Campus Desk</h5>
            <div className="pic-footer-contact-item">
              <MapPin size={15} />
              <span>Sector-7, Mansarovar, Jaipur 302020</span>
            </div>
            <div className="pic-footer-contact-item">
              <Phone size={15} />
              <span>+91-9694875297</span>
            </div>
            <div className="pic-footer-contact-item">
              <Mail size={15} />
              <span>admission@poddarinstitute.org</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pic-footer-bottom">
          <div>© 2026 Poddar International College, Jaipur. All rights reserved.</div>

          <div className="pic-footer-attribution">
            Campus photograph by Poddar International College via{' '}
            <a
              href="https://commons.wikimedia.org/wiki/File:Poddar_International_College_Campus.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Wikimedia Commons
            </a>
            , licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
            .
          </div>
        </div>
      </footer>
    </div>
  );
}
