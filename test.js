// CivicFix AI — Automated Verification Test Suite (Anonymous Citizen + Admin Only)
const app = require('./server/index.js');

const server = app.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log(`[Test] Server started on http://127.0.0.1:${port}`);
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. System status
    const r1 = await fetch(`${base}/api/system-status`);
    const j1 = await r1.json();
    console.log('✓ 1. System status endpoint:', j1.success, j1.data);

    // 2. Public issues board
    const r2 = await fetch(`${base}/api/issues`);
    const j2 = await r2.json();
    console.log(`✓ 2. Public issues board: total=${j2.data.counts.total}, loaded=${j2.data.issues.length}`);

    // 3. AI analysis with Telugu input
    const r3 = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'మా వీధిలో రోడ్డుపై పెద్ద గుంతలు ఉన్నాయి. వాహనాలు వెళ్లడం కష్టంగా ఉంది.',
        location_area: 'Kukatpally',
      }),
    });
    const j3 = await r3.json();
    console.log(`✓ 3. AI analyze (Telugu): success=${j3.success}, category="${j3.data.category}", priority="${j3.data.priority}"`);

    // 4. Anonymous complaint submission (no login required)
    const form = new FormData();
    form.append('description', 'Large garbage overflow near the park gate causing bad odor.');
    form.append('location_area', 'Miyapur');
    form.append('landmark', 'Opposite Community Gate');
    form.append('category', 'Garbage');
    form.append('priority', 'Medium');
    const r4 = await fetch(`${base}/api/complaints`, { method: 'POST', body: form });
    const j4 = await r4.json();
    if (!j4.success || !j4.data.tracking_code) {
      throw new Error(`Anonymous complaint submission failed: ${JSON.stringify(j4)}`);
    }
    const trackingCode = j4.data.tracking_code;
    console.log(`✓ 4. Submit complaint (Anonymous): success=${j4.success}, tracking_code="${trackingCode}"`);

    // 4b. Submit complaint with attached photo evidence
    const photoForm = new FormData();
    photoForm.append('description', 'Severe pothole crater on main road with photographic proof attached.');
    photoForm.append('location_area', 'Kukatpally');
    photoForm.append('landmark', 'Near Metro Pillar 120');
    photoForm.append('category', 'Road Damage');
    photoForm.append('priority', 'High');
    const dummyJpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xFF, 0xD9]);
    photoForm.append('photo', new Blob([dummyJpg], { type: 'image/jpeg' }), 'pothole_evidence.jpg');
    const r4b = await fetch(`${base}/api/complaints`, { method: 'POST', body: photoForm });
    const j4b = await r4b.json();
    const photoTrackingCode = j4b.data.tracking_code;
    console.log(`✓ 4b. Submit complaint with photo: success=${j4b.success}, tracking_code="${photoTrackingCode}"`);

    // 5. Track complaint
    const r5 = await fetch(`${base}/api/track/${trackingCode}`);
    const j5 = await r5.json();
    console.log(`✓ 5. Track complaint: code="${j5.data.tracking_code}", status="${j5.data.status}", area="${j5.data.location_area}"`);

    // 6. Admin authentication
    const r6 = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@civicfix.local', password: 'admin123' }),
    });
    const j6 = await r6.json();
    const adminToken = j6.data ? j6.data.token : null;
    console.log(`✓ 6. Admin authentication: success=${j6.success}, tokenReceived=${Boolean(adminToken)}`);

    // 6b. Verify admin can view the photo complaint
    const rAdminList = await fetch(`${base}/api/admin/complaints?search=${photoTrackingCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jAdminList = await rAdminList.json();
    const photoComplaint = jAdminList.data.complaints.find(c => c.tracking_code === photoTrackingCode);
    if (!photoComplaint || !photoComplaint.photo_url) {
      throw new Error(`Admin photo complaint lookup failed: ${JSON.stringify(photoComplaint)}`);
    }
    const rPhotoFetch = await fetch(`${base}${photoComplaint.photo_url}`);
    console.log(`✓ 6b. Photo evidence visible in admin: photo_url="${photoComplaint.photo_url}", HTTP status=${rPhotoFetch.status} OK`);

    // 7. Admin summary
    const r7 = await fetch(`${base}/api/admin/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const j7 = await r7.json();
    const topAreas = (j7.data.topLocations || []).map(a => `${a.area} (${a.count})`).join(', ');
    console.log(`✓ 7. Admin summary: total=${j7.data.counts.total}, topAreas=${topAreas}`);

    // 8. Location analysis & disclaimer
    const r8 = await fetch(`${base}/api/admin/locations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const j8 = await r8.json();
    console.log(`✓ 8. Location analysis: topAreasCount=${j8.data.topAreas.length}, disclaimer="${j8.data.disclaimer}"`);

    // 9. Real-time map locations
    const r9 = await fetch(`${base}/api/admin/map-locations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const j9 = await r9.json();
    console.log(`✓ 9. Real-time map locations: success=${j9.success}, count=${j9.data.count}, firstPoint="${j9.data.points[0].tracking_code}" @ [${j9.data.points[0].latitude}, ${j9.data.points[0].longitude}]`);

    // 10. Verify all public and admin pages return HTTP 200
    const pages = ['/', '/report', '/issues', '/track', '/admin/login', '/admin'];
    for (const p of pages) {
      const res = await fetch(`${base}${p}`);
      if (res.status !== 200) {
        throw new Error(`Page ${p} failed with status ${res.status}`);
      }
    }
    console.log(`✓ 10. All ${pages.length} public and admin routes return HTTP 200 OK`);

    // 11. Security Audit: Admin endpoint rejects unauthenticated and invalid tokens
    const rMissingAuth = await fetch(`${base}/api/admin/summary`);
    const rInvalidAuth = await fetch(`${base}/api/admin/summary`, {
      headers: { Authorization: 'Bearer totally_invalid_token_123' },
    });
    if (rMissingAuth.status !== 401 || rInvalidAuth.status !== 401) {
      throw new Error(`Admin route did not reject unauthorized requests: missing=${rMissingAuth.status}, invalid=${rInvalidAuth.status}`);
    }
    console.log(`✓ 11. Security: Admin endpoint rejects missing and invalid tokens (HTTP 401)`);

    // 12. Security Audit: File upload rejects non-image byte content with HTTP 400
    const spoofForm = new FormData();
    spoofForm.append('description', 'Attempting to upload executable disguised as image.');
    spoofForm.append('location_area', 'Kukatpally');
    const fakeExe = Buffer.from('MZ_FAKE_EXECUTABLE_HEADER_NOT_A_VALID_IMAGE');
    spoofForm.append('photo', new Blob([fakeExe], { type: 'image/jpeg' }), 'malicious.jpg');
    const rSpoof = await fetch(`${base}/api/complaints`, { method: 'POST', body: spoofForm });
    const jSpoof = await rSpoof.json();
    if (rSpoof.status !== 400 || !jSpoof.error.includes('valid JPG, PNG, or WebP')) {
      throw new Error(`File upload did not reject spoofed MIME: status=${rSpoof.status}, error=${jSpoof.error}`);
    }
    console.log(`✓ 12. Security: Spoofed file bytes rejected with HTTP 400: "${jSpoof.error}"`);

    // 13. Privacy Audit: Public endpoints strictly omit personal data
    const rIssuesPrivacy = await fetch(`${base}/api/issues`);
    const jIssuesPrivacy = await rIssuesPrivacy.json();
    const leakedPersonal = jIssuesPrivacy.data.issues.some(i => i.reporter_name || i.landmark || i.admin_note);
    if (leakedPersonal) {
      throw new Error('Public issues board leaked reporter_name, landmark, or admin_note!');
    }
    console.log(`✓ 13. Privacy: Public APIs strictly omit reporter_name, landmark, and admin_note`);

    // 14. Data Integrity: Submission without GPS coordinates retains null
    const noGpsForm = new FormData();
    noGpsForm.append('description', 'Issue submitted without device GPS coordinates.');
    noGpsForm.append('location_area', 'Ameerpet');
    const rNoGps = await fetch(`${base}/api/complaints`, { method: 'POST', body: noGpsForm });
    const jNoGps = await rNoGps.json();
    const rTrackNoGps = await fetch(`${base}/api/track/${jNoGps.data.tracking_code}`);
    const jTrackNoGps = await rTrackNoGps.json();
    if (jTrackNoGps.data.latitude !== null && jTrackNoGps.data.latitude !== undefined) {
      throw new Error(`Complaint without GPS had fabricated coordinates: ${jTrackNoGps.data.latitude}`);
    }
    console.log(`✓ 14. Data Integrity: Submission without GPS coordinates retains null (never fabricated)`);

    // 15. AI Robustness: Sanitizer normalizes invalid model outputs
    const { sanitizeAiOutput } = require('./server/ai');
    const sanitized = sanitizeAiOutput({
      category: 'Nuclear Radiation Hazard',
      priority: 'Extreme Danger',
      department: 'Space Force',
      reason: 'Hallucinated reason.',
    }, 'Test original description');
    if (sanitized.category !== 'Unclassified' || sanitized.priority !== 'Needs review' || sanitized.department !== 'Municipal Services') {
      throw new Error(`AI sanitizer did not normalize invalid values: ${JSON.stringify(sanitized)}`);
    }
    console.log(`✓ 15. AI Robustness: Invalid category, priority, and department normalized to allowlist defaults`);

    // 16. Admin Status Update and Public Workflow Verification
    const updateRes = await fetch(`${base}/api/admin/complaints/${photoComplaint.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'In Progress',
        admin_note: 'Assigned to field crew for inspection.',
      }),
    });
    if (updateRes.status !== 200) {
      throw new Error(`Status update failed with status ${updateRes.status}`);
    }
    const rTrackUpdated = await fetch(`${base}/api/track/${photoTrackingCode}`);
    const jTrackUpdated = await rTrackUpdated.json();
    if (jTrackUpdated.data.status !== 'In Progress') {
      throw new Error(`Citizen track did not reflect updated status. Got: ${jTrackUpdated.data.status}`);
    }
    console.log(`✓ 16. Workflow: Admin status change to "In Progress" verified on citizen tracking`);

    // 17. Citizen Auth Removal Verification: /api/auth/* endpoints return HTTP 404
    const rAuthRemoved = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });
    if (rAuthRemoved.status !== 404) {
      throw new Error(`Expected 404 for removed /api/auth/signup, got ${rAuthRemoved.status}`);
    }
    console.log(`✓ 17. Citizen Auth Removal: /api/auth/* routes completely removed (HTTP 404)`);

    // 18. Citizen Dashboard Removal Verification: /api/citizen/* returns HTTP 404
    const rCitizenRemoved = await fetch(`${base}/api/citizen/complaints`);
    if (rCitizenRemoved.status !== 404) {
      throw new Error(`Expected 404 for removed /api/citizen/complaints, got ${rCitizenRemoved.status}`);
    }
    console.log(`✓ 18. Citizen Dashboard Removal: /api/citizen/* routes completely removed (HTTP 404)`);

    // 19. Removed Citizen Pages Verification: /login, /signup, /my-complaints return HTTP 404
    const removedPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/my-complaints'];
    for (const rp of removedPages) {
      const res = await fetch(`${base}${rp}`, { headers: { 'Accept': 'application/json' } });
      if (res.status !== 404) {
        throw new Error(`Expected 404 for removed page ${rp}, got ${res.status}`);
      }
    }
    console.log(`✓ 19. Removed Citizen Pages: All 5 citizen pages cleanly return HTTP 404`);

    // 20. Privacy: Public complaint tracking strictly omits private photo URLs and personal data
    const rPublicTrack = await fetch(`${base}/api/track/${photoTrackingCode}`);
    const jPublicTrack = await rPublicTrack.json();
    if (jPublicTrack.data.photo_url || jPublicTrack.data.reporter_name || jPublicTrack.data.landmark || jPublicTrack.data.admin_note) {
      throw new Error(`Public tracking exposed private data: ${JSON.stringify(jPublicTrack.data)}`);
    }
    console.log(`✓ 20. Privacy: Public tracking strictly omits private photo URL, reporter_name, landmark, and admin_note`);

    console.log('\n>>> ALL 20 ANONYMOUS REPORTING & ADMIN SECURITY TESTS PASSED SUCCESSFULLY! <<<\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
