const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if valid credentials are provided
const isConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  !supabaseUrl.includes('your_supabase') &&
  !supabaseServiceKey.includes('your_server_only')
);

let supabase = null;
if (isConfigured) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Hyderabad major localities GPS coordinates reference
const HYDERABAD_LOCALITY_COORDS = {
  'kukatpally': { lat: 17.4948, lng: 78.3996 },
  'miyapur': { lat: 17.4968, lng: 78.3588 },
  'hitech city': { lat: 17.4435, lng: 78.3772 },
  'bharat nagar': { lat: 17.4649, lng: 78.4312 },
  'moosapet': { lat: 17.4721, lng: 78.4239 },
  'ameerpet': { lat: 17.4375, lng: 78.4482 },
  'gachibowli': { lat: 17.4401, lng: 78.3489 },
  'charminar': { lat: 17.3616, lng: 78.4747 },
  'secunderabad': { lat: 17.4399, lng: 78.4983 },
  'banjara hills': { lat: 17.4156, lng: 78.4357 },
  'jubilee hills': { lat: 17.4319, lng: 78.4073 },
  'begumpet': { lat: 17.4447, lng: 78.4664 },
  'kondapur': { lat: 17.4699, lng: 78.3578 },
  'madhapur': { lat: 17.4483, lng: 78.3915 },
  'dilsukhnagar': { lat: 17.3688, lng: 78.5247 },
  'mehdipatnam': { lat: 17.3916, lng: 78.4439 },
  'uppal': { lat: 17.4022, lng: 78.5604 },
  'lb nagar': { lat: 17.3457, lng: 78.5522 },
};

function resolveCoordinates(areaStr, trackingCode = '') {
  const norm = (areaStr || '').toLowerCase();
  for (const [key, coords] of Object.entries(HYDERABAD_LOCALITY_COORDS)) {
    if (norm.includes(key)) {
      // Deterministic slight jitter based on trackingCode so multiple pins in same area don't stack
      let hash = 0;
      for (let i = 0; i < trackingCode.length; i++) hash = (hash * 31 + trackingCode.charCodeAt(i)) % 1000;
      const jitterLat = ((hash % 100) - 50) * 0.00018;
      const jitterLng = (((hash >> 2) % 100) - 50) * 0.00018;
      return {
        latitude: Number((coords.lat + jitterLat).toFixed(6)),
        longitude: Number((coords.lng + jitterLng).toFixed(6)),
      };
    }
  }
  // Default to central Hyderabad with deterministic jitter
  let hash = 0;
  for (let i = 0; i < trackingCode.length; i++) hash = (hash * 31 + trackingCode.charCodeAt(i)) % 1000;
  const jitterLat = ((hash % 100) - 50) * 0.0003;
  const jitterLng = (((hash >> 2) % 100) - 50) * 0.0003;
  return {
    latitude: Number((17.4000 + jitterLat).toFixed(6)),
    longitude: Number((78.4500 + jitterLng).toFixed(6)),
  };
}

// In-memory demo store used only when Supabase credentials have not yet been configured in .env
const memoryStore = {
  complaints: [
    {
      id: 'demo-1',
      tracking_code: 'CF-3821',
      description: 'Deep road potholes near RTC cross road Kukatpally junction causing severe traffic jams and risk of accidents.',
      location_area: 'Kukatpally, Hyderabad',
      normalized_area: 'kukatpally',
      landmark: 'Near RTC Cross Road, Metro Pillar 120',
      reporter_name: 'P. Rao',
      photo_path: null,
      latitude: 17.4948,
      longitude: 78.3996,
      category: 'Road Damage',
      priority: 'High',
      suggested_department: 'Roads & Infrastructure',
      ai_reason: 'Deep road crater on major junction poses immediate traffic and two-wheeler collision hazards.',
      english_summary: 'Pothole near RTC cross road causing vehicle skids',
      status: 'In Progress',
      admin_note: 'Road repair team dispatched with cold asphalt mix.',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'demo-2',
      tracking_code: 'CF-3819',
      description: 'Community garbage dump overflowing outside residential colony for 3 days without collection.',
      location_area: 'Miyapur, Hyderabad',
      normalized_area: 'miyapur',
      landmark: 'Opposite Community Park Gate 2',
      reporter_name: 'S. Naidu',
      photo_path: null,
      latitude: 17.4968,
      longitude: 78.3588,
      category: 'Garbage',
      priority: 'Medium',
      suggested_department: 'Sanitation',
      ai_reason: 'Prolonged uncollected organic waste accumulation creates public hygiene and odor risks.',
      english_summary: 'Garbage not collected outside colony for 3 days',
      status: 'Pending',
      admin_note: null,
      created_at: new Date(Date.now() - 3600000 * 16).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 16).toISOString(),
    },
    {
      id: 'demo-3',
      tracking_code: 'CF-3815',
      description: 'Water pipeline rupture leaking clean municipal water across street behind Cyber Towers.',
      location_area: 'Hitech City, Hyderabad',
      normalized_area: 'hitech city',
      landmark: 'Behind Cyber Towers',
      reporter_name: null,
      photo_path: null,
      latitude: 17.4435,
      longitude: 78.3772,
      category: 'Water Leakage',
      priority: 'High',
      suggested_department: 'Water Supply',
      ai_reason: 'Active pipeline burst leading to significant treated water wastage and roadway ponding.',
      english_summary: 'Water leakage from main line flooding access lane',
      status: 'Resolved',
      admin_note: 'Pipeline valve replaced and pressure tested by municipal water board unit.',
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'demo-4',
      tracking_code: 'CF-3812',
      description: 'Streetlights not working on main residential lane causing pitch dark conditions at night.',
      location_area: 'Bharat Nagar, Hyderabad',
      normalized_area: 'bharat nagar',
      landmark: 'Lane 4 near Temple',
      reporter_name: null,
      photo_path: null,
      latitude: 17.4649,
      longitude: 78.4312,
      category: 'Streetlights',
      priority: 'Medium',
      suggested_department: 'Street Lighting',
      ai_reason: 'Non-functional street illumination impacts pedestrian safety after dark.',
      english_summary: 'Streetlights out along residential lane 4',
      status: 'Pending',
      admin_note: null,
      created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 30).toISOString(),
    },
    {
      id: 'demo-5',
      tracking_code: 'CF-3808',
      description: 'Blocked stormwater drain causing foul sewage water to overflow onto the road.',
      location_area: 'Moosapet, Hyderabad',
      normalized_area: 'moosapet',
      landmark: 'Near Y Junction',
      reporter_name: 'V. Reddy',
      photo_path: null,
      latitude: 17.4721,
      longitude: 78.4239,
      category: 'Drainage',
      priority: 'High',
      suggested_department: 'Drainage',
      ai_reason: 'Sewage overflow creates public health hazards and risks localized flooding.',
      english_summary: 'Drainage water overflow near Y junction',
      status: 'In Progress',
      admin_note: 'Suction jetting machine scheduled.',
      created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
  ],
};

function normalizeArea(area) {
  if (!area) return '';
  return area.trim().toLowerCase().replace(/\s+/g, ' ');
}

function generateTrackingCode() {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CF-${hex}`;
}

async function createComplaint(complaintData) {
  const trackingCode = generateTrackingCode();
  const normalizedArea = normalizeArea(complaintData.location_area);

  let lat = complaintData.latitude;
  let lng = complaintData.longitude;
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    const coords = resolveCoordinates(complaintData.location_area, trackingCode);
    lat = coords.latitude;
    lng = coords.longitude;
  }

  const record = {
    tracking_code: trackingCode,
    description: complaintData.description,
    location_area: complaintData.location_area,
    normalized_area: normalizedArea,
    landmark: complaintData.landmark || null,
    reporter_name: complaintData.reporter_name || null,
    photo_path: complaintData.photo_path || null,
    latitude: Number(lat),
    longitude: Number(lng),
    category: complaintData.category || 'Unclassified',
    priority: complaintData.priority || 'Needs review',
    suggested_department: complaintData.suggested_department || 'Municipal Services',
    ai_reason: complaintData.ai_reason || null,
    english_summary: complaintData.english_summary || complaintData.description.slice(0, 180),
    status: 'Pending',
    admin_note: null,
  };

  if (isConfigured) {
    const { data, error } = await supabase
      .from('complaints')
      .insert(record)
      .select('tracking_code, status')
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    return data;
  } else {
    const newRecord = {
      ...record,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.complaints.unshift(newRecord);
    return {
      tracking_code: newRecord.tracking_code,
      status: newRecord.status,
    };
  }
}

async function getPublicIssueCounts() {
  if (isConfigured) {
    const [totalRes, pendingRes, inProgressRes, resolvedRes] = await Promise.all([
      supabase.from('complaints').select('*', { count: 'exact', head: true }),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'In Progress'),
      supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Resolved'),
    ]);

    return {
      total: totalRes.count || 0,
      pending: pendingRes.count || 0,
      in_progress: inProgressRes.count || 0,
      resolved: resolvedRes.count || 0,
    };
  } else {
    const total = memoryStore.complaints.length;
    const pending = memoryStore.complaints.filter((c) => c.status === 'Pending').length;
    const in_progress = memoryStore.complaints.filter((c) => c.status === 'In Progress').length;
    const resolved = memoryStore.complaints.filter((c) => c.status === 'Resolved').length;
    return { total, pending, in_progress, resolved };
  }
}

async function getPublicIssues({ page = 1, limit = 15, category, status, search }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (isConfigured) {
    let query = supabase
      .from('complaints')
      .select('tracking_code, category, location_area, landmark, english_summary, priority, status, created_at, latitude, longitude', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (status && status !== 'All') {
      query = query.eq('status', status);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`location_area.ilike.${s},english_summary.ilike.${s}`);
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    const counts = await getPublicIssueCounts();
    return {
      issues: data || [],
      counts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } else {
    let filtered = [...memoryStore.complaints];

    if (category && category !== 'All') {
      filtered = filtered.filter((c) => c.category === category);
    }
    if (status && status !== 'All') {
      filtered = filtered.filter((c) => c.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.location_area.toLowerCase().includes(q) ||
          (c.english_summary && c.english_summary.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const totalCount = filtered.length;
    const paged = filtered.slice(from, to + 1).map((c) => ({
      tracking_code: c.tracking_code,
      category: c.category,
      location_area: c.location_area,
      landmark: c.landmark || null,
      english_summary: c.english_summary,
      priority: c.priority,
      status: c.status,
      created_at: c.created_at,
      latitude: c.latitude,
      longitude: c.longitude,
    }));

    const counts = await getPublicIssueCounts();
    return {
      issues: paged,
      counts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}

async function getComplaintByTrackingCode(trackingCode) {
  const code = (trackingCode || '').trim().toUpperCase();

  if (isConfigured) {
    const { data, error } = await supabase
      .from('complaints')
      .select('tracking_code, category, location_area, priority, suggested_department, status, created_at, updated_at, photo_path')
      .eq('tracking_code', code)
      .single();

    if (error || !data) return null;
    const photo_url = data.photo_path ? await getSignedPhotoUrl(data.photo_path, 300) : null;
    return { ...data, photo_url, has_photo: Boolean(data.photo_path) };
  } else {
    const item = memoryStore.complaints.find((c) => c.tracking_code.toUpperCase() === code);
    if (!item) return null;
    const photo_url = item.photo_path ? await getSignedPhotoUrl(item.photo_path, 300) : null;
    return {
      tracking_code: item.tracking_code,
      category: item.category,
      location_area: item.location_area,
      priority: item.priority,
      suggested_department: item.suggested_department,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      photo_path: item.photo_path,
      photo_url,
      has_photo: Boolean(item.photo_path),
    };
  }
}

async function getAdminComplaints({ page = 1, limit = 20, category, status, search }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (isConfigured) {
    let query = supabase
      .from('complaints')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (status && status !== 'All') {
      query = query.eq('status', status);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`tracking_code.ilike.${s},location_area.ilike.${s},description.ilike.${s}`);
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return {
      complaints: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } else {
    let list = [...memoryStore.complaints];
    if (category && category !== 'All') {
      list = list.filter((c) => c.category === category);
    }
    if (status && status !== 'All') {
      list = list.filter((c) => c.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.tracking_code.toLowerCase().includes(q) ||
          c.location_area.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const totalCount = list.length;
    const paged = list.slice(from, to + 1);

    return {
      complaints: paged,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }
}

async function getComplaintById(id) {
  if (isConfigured) {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data;
  } else {
    return memoryStore.complaints.find((c) => c.id === id) || null;
  }
}

async function updateComplaint(id, updates) {
  const allowedFields = ['category', 'priority', 'suggested_department', 'status', 'admin_note'];
  const sanitizedUpdates = {};
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      sanitizedUpdates[field] = updates[field];
    }
  }

  if (isConfigured) {
    const { data, error } = await supabase
      .from('complaints')
      .update(sanitizedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } else {
    const index = memoryStore.complaints.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Complaint not found');
    memoryStore.complaints[index] = {
      ...memoryStore.complaints[index],
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
    };
    return memoryStore.complaints[index];
  }
}

async function getRealtimeMapPoints() {
  let list = [];
  if (isConfigured) {
    const { data, error } = await supabase
      .from('complaints')
      .select('id, tracking_code, description, location_area, landmark, category, priority, status, created_at, english_summary, latitude, longitude')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) {
      list = data;
    }
  } else {
    list = memoryStore.complaints;
  }

  return list.map((c) => {
    let lat = c.latitude;
    let lng = c.longitude;
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const resolved = resolveCoordinates(c.location_area, c.tracking_code);
      lat = resolved.latitude;
      lng = resolved.longitude;
    }
    return {
      id: c.id,
      tracking_code: c.tracking_code,
      location_area: c.location_area,
      landmark: c.landmark || null,
      category: c.category,
      priority: c.priority,
      status: c.status,
      created_at: c.created_at,
      english_summary: c.english_summary || c.description,
      latitude: Number(lat),
      longitude: Number(lng),
    };
  });
}

async function getAdminSummary() {
  const counts = await getPublicIssueCounts();

  let recent = [];
  let locationGroups = {};
  let categoryGroups = {};

  if (isConfigured) {
    const { data: recents } = await supabase
      .from('complaints')
      .select('id, tracking_code, english_summary, location_area, category, priority, status, created_at, photo_path')
      .order('created_at', { ascending: false })
      .limit(8);
    recent = recents || [];

    const { data: allComplaints } = await supabase
      .from('complaints')
      .select('normalized_area, location_area, category');

    (allComplaints || []).forEach((c) => {
      const norm = c.normalized_area || 'other';
      locationGroups[norm] = locationGroups[norm] || {
        displayName: c.location_area || norm,
        count: 0,
      };
      locationGroups[norm].count += 1;

      const cat = c.category || 'Unclassified';
      categoryGroups[cat] = (categoryGroups[cat] || 0) + 1;
    });
  } else {
    recent = memoryStore.complaints.slice(0, 8).map((c) => ({
      id: c.id,
      tracking_code: c.tracking_code,
      english_summary: c.english_summary,
      location_area: c.location_area,
      category: c.category,
      priority: c.priority,
      status: c.status,
      photo_path: c.photo_path,
      created_at: c.created_at,
    }));

    memoryStore.complaints.forEach((c) => {
      const norm = c.normalized_area || 'other';
      locationGroups[norm] = locationGroups[norm] || {
        displayName: c.location_area || norm,
        count: 0,
      };
      locationGroups[norm].count += 1;

      const cat = c.category || 'Unclassified';
      categoryGroups[cat] = (categoryGroups[cat] || 0) + 1;
    });
  }

  const topLocations = Object.entries(locationGroups)
    .map(([key, val]) => ({
      area: val.displayName,
      normalized_area: key,
      count: val.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const categories = Object.entries(categoryGroups)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const mapPoints = await getRealtimeMapPoints();

  return {
    counts,
    recent,
    topLocations,
    categories,
    mapPoints,
    isConfigured,
  };
}

async function getLocationAnalysis() {
  let allComplaints = [];

  if (isConfigured) {
    const { data, error } = await supabase
      .from('complaints')
      .select('normalized_area, location_area, category, status');
    if (error) throw new Error(error.message);
    allComplaints = data || [];
  } else {
    allComplaints = memoryStore.complaints;
  }

  const map = {};
  for (const item of allComplaints) {
    const key = item.normalized_area || 'unspecified';
    if (!map[key]) {
      map[key] = {
        normalized_area: key,
        displayName: item.location_area || key,
        total: 0,
        categories: {},
        statuses: { Pending: 0, 'In Progress': 0, Resolved: 0 },
      };
    }
    map[key].total += 1;
    map[key].categories[item.category] = (map[key].categories[item.category] || 0) + 1;
    if (map[key].statuses[item.status] !== undefined) {
      map[key].statuses[item.status] += 1;
    }
  }

  const sorted = Object.values(map)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((entry) => ({
      area: entry.displayName,
      normalized_area: entry.normalized_area,
      total_reports: entry.total,
      categories: entry.categories,
      statuses: entry.statuses,
    }));

  return {
    topAreas: sorted,
    disclaimer: 'These figures count submitted reports, not verified problem frequency.',
  };
}

async function uploadPhoto(buffer, filename, mimeType) {
  if (!buffer || !buffer.length) {
    return null;
  }

  const cleanName = path.basename(filename || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '');
  const safeFilename = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${cleanName || 'image.jpg'}`;

  // If Supabase is configured, try Supabase cloud storage first
  if (isConfigured) {
    try {
      const safePath = `evidence/${safeFilename}`;
      const { error } = await supabase.storage
        .from('complaint-photos')
        .upload(safePath, buffer, {
          contentType: mimeType || 'image/jpeg',
          upsert: false,
        });

      if (!error) {
        return safePath;
      }
      console.warn('[Storage] Supabase storage upload failed, saving locally:', error.message);
    } catch (sbErr) {
      console.warn('[Storage] Supabase storage exception, saving locally:', sbErr.message);
    }
  }

  // Local storage (guarantees uploaded photo is saved to disk and visible in admin portal)
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const localFilePath = path.join(UPLOADS_DIR, safeFilename);
    fs.writeFileSync(localFilePath, buffer);
    return `uploads/${safeFilename}`;
  } catch (err) {
    console.error('[Storage] Local photo save error:', err);
    throw new Error(`Failed to store uploaded photo: ${err.message}`);
  }
}

async function getSignedPhotoUrl(photoPath, expiresInSeconds = 300) {
  if (!photoPath || typeof photoPath !== 'string') return null;

  const trimmed = photoPath.trim();
  if (!trimmed) return null;

  // 1. Direct web URL or data URI
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, '/');

  // 2. Direct local uploads path
  if (normalized.startsWith('uploads/') || normalized.startsWith('/uploads/')) {
    return `/${normalized.replace(/^\/+/, '')}`;
  }

  // 3. Supabase storage signed URL (if configured)
  if (isConfigured) {
    try {
      const { data, error } = await supabase.storage
        .from('complaint-photos')
        .createSignedUrl(trimmed, expiresInSeconds);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch (err) {
      console.warn('[Storage] Error generating Supabase signed URL:', err.message);
    }
  }

  // 4. Check if file exists in local public/uploads directory by basename
  const baseName = path.basename(normalized);
  const localCheck = path.join(UPLOADS_DIR, baseName);
  if (fs.existsSync(localCheck)) {
    return `/uploads/${baseName}`;
  }

  // 5. Fallback path for client browser
  return `/${normalized.replace(/^\/+/, '')}`;
}

async function deletePhoto(photoPath) {
  if (!photoPath) return;

  if (isConfigured) {
    try {
      await supabase.storage.from('complaint-photos').remove([photoPath]);
    } catch (err) {
      console.error('[Storage] Supabase delete photo error:', err);
    }
  }

  try {
    const baseName = path.basename(photoPath);
    const localFilePath = path.join(UPLOADS_DIR, baseName);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (err) {
    console.error('[Storage] Local delete photo error:', err);
  }
}

module.exports = {
  supabase,
  isConfigured,
  normalizeArea,
  createComplaint,
  getPublicIssues,
  getPublicIssueCounts,
  getComplaintByTrackingCode,
  getAdminComplaints,
  getComplaintById,
  updateComplaint,
  getAdminSummary,
  getLocationAnalysis,
  getRealtimeMapPoints,
  uploadPhoto,
  getSignedPhotoUrl,
  deletePhoto,
};
