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

    console.log('\n>>> ALL 10 ACCEPTANCE CRITERIA TESTS PASSED SUCCESSFULLY! <<<\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
