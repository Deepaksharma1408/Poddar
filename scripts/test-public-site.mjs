// Verification script for Public Site & Login Gateway
import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== VERIFYING PODDAR PUBLIC HOMEPAGE & LOGIN GATEWAY ===\n');

// 1. Verify Assets
const assets = [
  'public/images/poddar/campus-main.jpg',
  'public/images/poddar/college-logo.png',
  'public/images/poddar/campus-gallery-01.jpg',
  'public/images/poddar/campus-gallery-02.jpg',
  'public/images/poddar/students-campus.jpg',
  'public/images/poddar/academic-lab.jpg',
  'public/images/poddar/campus-life-01.jpg',
  'public/images/poddar/campus-life-02.jpg',
];

for (const a of assets) {
  assert.ok(fs.existsSync(a), `Asset must exist: ${a}`);
  const stats = fs.statSync(a);
  assert.ok(stats.size > 1000, `Asset ${a} must not be empty (size: ${stats.size})`);
}
console.log(`✔ All ${assets.length} real institutional assets verified in public/images/poddar.`);

// 2. Verify Routes
const routes = [
  'app/page.tsx',
  'app/login/page.tsx',
  'app/portal/page.tsx',
  'app/public-site.css',
];

for (const r of routes) {
  assert.ok(fs.existsSync(r), `Route file must exist: ${r}`);
}
console.log(`✔ All public route files exist.`);

// 3. Verify Homepage Content
const homeContent = fs.readFileSync('app/page.tsx', 'utf8');
assert.ok(homeContent.includes('Shape Your Future') && homeContent.includes('Create Your Legacy'), 'Hero headline verified');
assert.ok(homeContent.includes('/login'), 'Portal Login navigation link verified');
assert.ok(homeContent.includes('University of Rajasthan'), 'University of Rajasthan affiliation verified');
assert.ok(homeContent.includes('CC BY-SA 4.0'), 'Mandatory CC BY-SA 4.0 attribution verified');
assert.ok(homeContent.includes('1998'), 'Founding year verified');
console.log(`✔ Public homepage institutional facts & attribution verified.`);

// 4. Verify Login Content & Security
const loginContent = fs.readFileSync('app/login/page.tsx', 'utf8');
assert.ok(loginContent.includes('campus-main.jpg'), 'Split-screen campus photo verified');
assert.ok(loginContent.includes('Sign In to Portal'), 'Sign in CTA verified');
assert.ok(loginContent.includes('showPassword'), 'Password toggle state verified');
assert.ok(loginContent.includes('256-Bit SSL Encrypted'), 'Security encryption badge verified');
assert.ok(loginContent.includes('CC BY-SA 4.0'), 'Login photo attribution verified');
console.log(`✔ Split-screen login gateway verified.`);

console.log('\n=== ALL PUBLIC HOMEPAGE & LOGIN EXPERIENCE CHECKS PASSED! ===');
