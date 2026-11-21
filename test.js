// CivicFix AI — Automated Verification Test Suite
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

    // 4. Submit complaint
    const form = new FormData();
    form.append('description', 'Large garbage overflow near the park gate causing bad odor.');
    form.append('location_area', 'Miyapur');
    form.append('landmark', 'Opposite Community Gate');
    form.append('category', 'Garbage');
    form.append('priority', 'Medium');
    const r4 = await fetch(`${base}/api/complaints`, { method: 'POST', body: form });
    const j4 = await r4.json();
    const trackingCode = j4.data.tracking_code;
    console.log(`✓ 4. Submit complaint: success=${j4.success}, tracking_code="${trackingCode}"`);

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

    // 6. Admin login (offline demo credentials)
    const r6 = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@civicfix.local', password: 'admin123' }),
    });
    const j6 = await r6.json();
    console.log(`✓ 6. Admin authentication: success=${j6.success}, tokenReceived=${Boolean(j6.data?.token)}`);

    const adminToken = j6.data.token;

    // 6b. Verify uploaded photo in Admin complaints list and detail modal
    const rAdminList = await fetch(`${base}/api/admin/complaints?search=${photoTrackingCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jAdminList = await rAdminList.json();
    const photoComplaint = jAdminList.data.complaints.find((c) => c.tracking_code === photoTrackingCode);
    if (!photoComplaint) throw new Error('Complaint with photo not found in admin table');
    if (!photoComplaint.has_photo || !photoComplaint.photo_url) {
      throw new Error(`Expected complaint to have photo, got has_photo=${photoComplaint.has_photo}, photo_url=${photoComplaint.photo_url}`);
    }

    const rAdminDetail = await fetch(`${base}/api/admin/complaints/${photoComplaint.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jAdminDetail = await rAdminDetail.json();
    if (!jAdminDetail.data.photo_url) {
      throw new Error('Complaint detail missing photo_url');
    }
    const photoFetch = await fetch(`${base}${jAdminDetail.data.photo_url}`);
    if (photoFetch.status !== 200) {
      throw new Error(`Photo URL failed to load: HTTP status ${photoFetch.status}`);
    }
    console.log(`✓ 6b. Photo evidence visible in admin: photo_url="${jAdminDetail.data.photo_url}", HTTP status=${photoFetch.status} OK`);

    // 7. Admin summary
    const r7 = await fetch(`${base}/api/admin/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const j7 = await r7.json();
    console.log(`✓ 7. Admin summary: total=${j7.data.counts.total}, topAreas=${j7.data.topLocations.map((l) => `${l.area} (${l.count})`).join(', ')}`);

    // 8. Admin location analysis
    const r8 = await fetch(`${base}/api/admin/locations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const j8 = await r8.json();
    console.log(`✓ 8. Location analysis: topAreasCount=${j8.data.topAreas.length}, disclaimer="${j8.data.disclaimer}"`);

    // 9. Real-time map locations endpoint
    const r9 = await fetch(`${base}/api/admin/map-locations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const j9 = await r9.json();
    console.log(`✓ 9. Real-time map locations: success=${j9.success}, count=${j9.data.count}, firstPoint="${j9.data.points[0]?.tracking_code}" @ [${j9.data.points[0]?.latitude}, ${j9.data.points[0]?.longitude}]`);

    // 10. Static HTML pages check
    const pages = ['/', '/report', '/issues', '/track', '/admin/login', '/admin', '/admin/complaints', '/admin/locations'];
    for (const p of pages) {
      const res = await fetch(`${base}${p}`);
      if (res.status !== 200) throw new Error(`Page ${p} returned ${res.status}`);
    }
    console.log(`✓ 10. All 8 routes return HTTP 200 OK`);

    // 11. Security: Unauthorized access to Admin API rejected (401)
    const rNoAuth = await fetch(`${base}/api/admin/summary`);
    const rBadAuth = await fetch(`${base}/api/admin/summary`, {
      headers: { Authorization: 'Bearer invalid-token-12345' },
    });
    if (rNoAuth.status !== 401 || rBadAuth.status !== 401) {
      throw new Error(`Expected 401 Unauthorized for unprotected admin requests, got ${rNoAuth.status} and ${rBadAuth.status}`);
    }
    console.log(`✓ 11. Security: Admin endpoint rejects missing and invalid tokens (HTTP 401)`);

    // 12. Security: Spoofed image magic bytes rejected (400)
    const spoofedForm = new FormData();
    spoofedForm.append('description', 'Attempting upload of malicious disguised payload.');
    spoofedForm.append('location_area', 'Madhapur');
    spoofedForm.append('category', 'Other');
    spoofedForm.append('priority', 'Low');
    const fakeJpg = Buffer.from('<?php echo "evil"; ?>NotARealImageFile');
    spoofedForm.append('photo', new Blob([fakeJpg], { type: 'image/jpeg' }), 'script.jpg');
    const rSpoof = await fetch(`${base}/api/complaints`, { method: 'POST', body: spoofedForm });
    if (rSpoof.status !== 400) {
      throw new Error(`Expected 400 Bad Request for spoofed image bytes, got ${rSpoof.status}`);
    }
    const jSpoof = await rSpoof.json();
    console.log(`✓ 12. Security: Spoofed file bytes rejected with HTTP 400: "${jSpoof.error}"`);

    // 13. Privacy: Public endpoints do not expose reporter_name or landmark
    const rPublicCheck = await fetch(`${base}/api/issues`);
    const jPublicCheck = await rPublicCheck.json();
    for (const issue of jPublicCheck.data.issues) {
      if (issue.landmark !== undefined || issue.reporter_name !== undefined || issue.admin_note !== undefined) {
        throw new Error(`Public issues leaked private field on issue ${issue.tracking_code}`);
      }
    }
    const rTrackPriv = await fetch(`${base}/api/track/${trackingCode}`);
    const jTrackPriv = await rTrackPriv.json();
    if (jTrackPriv.data.landmark !== undefined || jTrackPriv.data.reporter_name !== undefined || jTrackPriv.data.admin_note !== undefined) {
      throw new Error('Track API leaked private reporter details');
    }
    console.log(`✓ 13. Privacy: Public APIs strictly omit reporter_name, landmark, and admin_note`);

    // 14. Data Integrity: Unprovided GPS coordinates remain null
    const rAdminNoGps = await fetch(`${base}/api/admin/complaints?search=${trackingCode}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const jAdminNoGps = await rAdminNoGps.json();
    const noGpsRecord = jAdminNoGps.data.complaints.find((c) => c.tracking_code === trackingCode);
    if (!noGpsRecord) throw new Error('Complaint record not found for GPS integrity check');
    if (noGpsRecord.latitude !== null || noGpsRecord.longitude !== null) {
      throw new Error(`Expected null coordinates for submission without GPS, got lat=${noGpsRecord.latitude}, lng=${noGpsRecord.longitude}`);
    }
    console.log(`✓ 14. Data Integrity: Submission without GPS coordinates retains null (never fabricated)`);

    // 15. AI Output Sanitization: Unknown categories and departments strictly fall back
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

    // 17. Citizen Authentication (Registration & Login)
    const citizenEmail = 'test_citizen_alpha@example.com';
    const rSignup = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: citizenEmail, password: 'password123' }),
    });
    const jSignup = await rSignup.json();
    if (rSignup.status !== 201 || !jSignup.success) {
      throw new Error(`Citizen signup failed: ${JSON.stringify(jSignup)}`);
    }
    const citizenToken = jSignup.data.token;
    const citizenId = jSignup.data.user.id;
    console.log(`✓ 17. Citizen registration: status=${rSignup.status}, user_id="${citizenId}"`);

    // 18. Authenticated Complaint Submission
    const authForm = new FormData();
    authForm.append('description', 'Leaking water pipeline near community hall.');
    authForm.append('location_area', 'Madhapur');
    authForm.append('category', 'Water Leakage');
    authForm.append('priority', 'High');
    const rAuthSubmit = await fetch(`${base}/api/complaints`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: authForm,
    });
    const jAuthSubmit = await rAuthSubmit.json();
    const citizenTrackingCode = jAuthSubmit.data.tracking_code;
    console.log(`✓ 18. Authenticated complaint submission: tracking_code="${citizenTrackingCode}"`);

    // 19. Citizen Dashboard: "My Complaints" isolation
    const rMyComplaints = await fetch(`${base}/api/citizen/complaints`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const jMyComplaints = await rMyComplaints.json();
    if (rMyComplaints.status !== 200 || !jMyComplaints.data.complaints.some(c => c.tracking_code === citizenTrackingCode)) {
      throw new Error(`Citizen dashboard missing user's complaint`);
    }
    // Verify it does NOT include the guest complaint from test 4
    if (jMyComplaints.data.complaints.some(c => c.tracking_code === trackingCode)) {
      throw new Error(`Citizen dashboard leaked anonymous guest complaint!`);
    }
    console.log(`✓ 19. Citizen dashboard: returns own complaints (${jMyComplaints.data.total}) and strictly isolates from guests`);

    // 20. Ownership Protection: Citizen B cannot view Citizen A's complaint detail
    const rSignupB = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'citizen_beta@example.com', password: 'password123' }),
    });
    const jSignupB = await rSignupB.json();
    const citizenTokenB = jSignupB.data.token;
    const citizenAComplaintId = jMyComplaints.data.complaints[0].id;

    const rCrossAccess = await fetch(`${base}/api/citizen/complaints/${citizenAComplaintId}`, {
      headers: { Authorization: `Bearer ${citizenTokenB}` },
    });
    if (rCrossAccess.status !== 404) {
      throw new Error(`Expected 404 for cross-citizen access, got status ${rCrossAccess.status}`);
    }
    console.log(`✓ 20. Ownership Protection: Cross-citizen access to complaint detail rejected (HTTP 404)`);

    // 21. Security: Guest attempting to access protected citizen complaints is rejected (HTTP 401)
    const rGuestAccess = await fetch(`${base}/api/citizen/complaints`);
    if (rGuestAccess.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated citizen route, got ${rGuestAccess.status}`);
    }
    console.log(`✓ 21. Security: Unauthenticated access to citizen complaints dashboard rejected (HTTP 401)`);

    // 22. Security: Invalid supplied Bearer token on /api/complaints rejected with HTTP 401
    const invalidForm = new FormData();
    invalidForm.append('description', 'Test complaint with invalid token attached.');
    invalidForm.append('location_area', 'Kukatpally');
    const rInvalidToken = await fetch(`${base}/api/complaints`, {
      method: 'POST',
      headers: { Authorization: 'Bearer fake_invalid_expired_token' },
      body: invalidForm,
    });
    if (rInvalidToken.status !== 401) {
      throw new Error(`Expected 401 for invalid supplied token, got ${rInvalidToken.status}`);
    }
    console.log(`✓ 22. Security: Invalid/expired supplied token rejected with HTTP 401 (not silently accepted as guest)`);

    // 23. Security: Citizen account cannot access admin endpoints (HTTP 403)
    const rCitizenToAdmin = await fetch(`${base}/api/admin/summary`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    if (rCitizenToAdmin.status !== 403) {
      throw new Error(`Expected 403 when citizen accesses admin endpoint, got ${rCitizenToAdmin.status}`);
    }
    console.log(`✓ 23. Security: Citizen account strictly denied access to /api/admin/* (HTTP 403 Forbidden)`);

    // 24. Privacy: Public complaint tracking strictly omits private photo URLs and personal data
    const rPublicTrack = await fetch(`${base}/api/track/${citizenTrackingCode}`);
    const jPublicTrack = await rPublicTrack.json();
    if (jPublicTrack.data.photo_url || jPublicTrack.data.reporter_name || jPublicTrack.data.reporter_user_id) {
      throw new Error(`Public tracking exposed private data or photo URL: ${JSON.stringify(jPublicTrack.data)}`);
    }
    console.log(`✓ 24. Privacy: Public tracking strictly omits private photo URL, reporter_name, and user ID`);

    console.log('\n>>> ALL 24 REGRESSION, CITIZEN AUTH & SECURITY AUDIT TESTS PASSED SUCCESSFULLY! <<<\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
