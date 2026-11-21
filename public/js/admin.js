// CivicFix AI — Unified Admin Portal Engine with Real-Time Interactive Mapping

document.addEventListener('DOMContentLoaded', () => {
  // 1. Authentication Check
  const token = localStorage.getItem('civicfix_admin_token');
  const isLoginPage = window.location.pathname.includes('/admin/login');

  if (!token && !isLoginPage) {
    window.location.href = '/admin/login';
    return;
  }

  // Display stored admin user email
  const userJson = localStorage.getItem('civicfix_admin_user');
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      document.querySelectorAll('#adminUserEmail').forEach((el) => {
        el.textContent = user.email || 'admin@civicfix.local';
      });
    } catch {}
  }

  // Logout handlers
  function logout() {
    localStorage.removeItem('civicfix_admin_token');
    localStorage.removeItem('civicfix_admin_user');
    window.location.href = '/admin/login';
  }

  document.querySelectorAll('#adminLogoutBtn, #adminLogoutSidebar').forEach((btn) => {
    btn.addEventListener('click', logout);
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('adminMobileToggle');
  const sidebar = document.getElementById('adminSidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  const isDemoMode = localStorage.getItem('civicfix_admin_demo') === 'true' ||
                     token === 'demo_judge_session_active';

  let demoViewMode = 'sandbox'; // 'sandbox' (12 sample complaints) | 'live' (real public feed)
  let livePublicComplaints = [];
  let isCurrentComplaintLive = false;

  // Visual banner and labels when Demo Mode is active
  if (isDemoMode) {
    const demoBanner = document.getElementById('demoModeBanner');
    if (demoBanner) demoBanner.style.display = 'flex';

    const demoViewSwitcher = document.getElementById('demoViewSwitcher');
    if (demoViewSwitcher) demoViewSwitcher.style.display = 'flex';

    document.querySelectorAll('#adminUserEmail').forEach((el) => {
      el.textContent = 'admin@civicfix.demo (Judge Demo)';
      el.title = 'Interactive Evaluation Sandbox Mode';
    });

    const btnViewSampleSandbox = document.getElementById('btnViewSampleSandbox');
    const btnViewLiveFeed = document.getElementById('btnViewLiveFeed');
    const btnRefreshLiveComplaints = document.getElementById('btnRefreshLiveComplaints');
    const demoViewBadgeDesc = document.getElementById('demoViewBadgeDesc');

    function setDemoView(mode) {
      demoViewMode = mode;
      if (mode === 'sandbox') {
        if (btnViewSampleSandbox) {
          btnViewSampleSandbox.style.background = 'white';
          btnViewSampleSandbox.style.color = 'var(--color-dark-teal)';
          btnViewSampleSandbox.style.fontWeight = '700';
          btnViewSampleSandbox.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
        if (btnViewLiveFeed) {
          btnViewLiveFeed.style.background = 'transparent';
          btnViewLiveFeed.style.color = 'var(--color-text-muted)';
          btnViewLiveFeed.style.fontWeight = '600';
          btnViewLiveFeed.style.boxShadow = 'none';
        }
        if (btnRefreshLiveComplaints) btnRefreshLiveComplaints.style.display = 'none';
        if (demoViewBadgeDesc) demoViewBadgeDesc.textContent = 'Interactive fictional complaints with status updates & triage.';
      } else {
        if (btnViewLiveFeed) {
          btnViewLiveFeed.style.background = 'white';
          btnViewLiveFeed.style.color = 'var(--color-dark-teal)';
          btnViewLiveFeed.style.fontWeight = '700';
          btnViewLiveFeed.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
        if (btnViewSampleSandbox) {
          btnViewSampleSandbox.style.background = 'transparent';
          btnViewSampleSandbox.style.color = 'var(--color-text-muted)';
          btnViewSampleSandbox.style.fontWeight = '600';
          btnViewSampleSandbox.style.boxShadow = 'none';
        }
        if (btnRefreshLiveComplaints) btnRefreshLiveComplaints.style.display = 'inline-flex';
        if (demoViewBadgeDesc) demoViewBadgeDesc.textContent = 'Real citizen submissions loaded via safe public API (Read-only).';
      }
      loadComplaints(1);
    }

    if (btnViewSampleSandbox) {
      btnViewSampleSandbox.addEventListener('click', () => setDemoView('sandbox'));
    }
    if (btnViewLiveFeed) {
      btnViewLiveFeed.addEventListener('click', () => setDemoView('live'));
    }
    if (btnRefreshLiveComplaints) {
      btnRefreshLiveComplaints.addEventListener('click', () => {
        btnRefreshLiveComplaints.disabled = true;
        btnRefreshLiveComplaints.innerHTML = '<i data-lucide="loader" class="icon-14 spin"></i> Refreshing...';
        if (window.initIcons) window.initIcons();
        loadComplaints(currentPage).finally(() => {
          btnRefreshLiveComplaints.disabled = false;
          btnRefreshLiveComplaints.innerHTML = '<i data-lucide="refresh-cw" class="icon-14"></i> Refresh Live Feed';
          if (window.initIcons) window.initIcons();
        });
      });
    }

    const resetBtn = document.getElementById('btnResetDemoData');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        DemoStore.reset();
        loadDashboard();
        if (currentTab === 'complaints') loadComplaints(1);
        if (currentTab === 'locations') loadLocations();
        fetchRealtimeMapPoints();
        alert('Demo sample complaints have been reset to defaults.');
      });
    }

    const exitBtn = document.getElementById('btnExitDemoMode');
    if (exitBtn) {
      exitBtn.addEventListener('click', logout);
    }
  }

  // -------------------------------------------------------------
  // DEMO DATA STORE FOR EVALUATION SANDBOX (ISOLATED CLIENT-SIDE STATE)
  // -------------------------------------------------------------
  const DemoStore = {
    KEY: 'civicfix_demo_complaints_v1',
    getDefaults() {
      return [
        {
          id: 'demo-1',
          tracking_code: 'CF-3821',
          description: 'Deep road potholes near RTC cross road Kukatpally junction causing severe traffic jams and risk of accidents.',
          location_area: 'Kukatpally, Hyderabad',
          normalized_area: 'kukatpally',
          landmark: 'Near RTC Cross Road, Metro Pillar 120',
          reporter_name: 'P. Rao',
          photo_path: null,
          photo_url: null,
          latitude: 17.4948,
          longitude: 78.3996,
          category: 'Road Damage',
          priority: 'High',
          suggested_department: 'Road Maintenance',
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
          photo_url: null,
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
          reporter_name: 'K. Sharma',
          photo_path: null,
          photo_url: null,
          latitude: 17.4435,
          longitude: 78.3772,
          category: 'Water Leakage',
          priority: 'High',
          suggested_department: 'Water Supply',
          ai_reason: 'Significant water loss and localized roadway erosion on critical IT corridor artery.',
          english_summary: 'Potable water pipeline burst behind Cyber Towers',
          status: 'In Progress',
          admin_note: 'Line valve shut off. Emergency repair team on site.',
          created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
        },
        {
          id: 'demo-4',
          tracking_code: 'CF-3811',
          description: 'Multiple streetlights not functioning along main market road causing dark spots at night.',
          location_area: 'Bharat Nagar, Hyderabad',
          normalized_area: 'bharat nagar',
          landmark: 'Near Railway Gate',
          reporter_name: 'M. Ali',
          photo_path: null,
          photo_url: null,
          latitude: 17.4649,
          longitude: 78.4312,
          category: 'Streetlights',
          priority: 'Low',
          suggested_department: 'Street Lighting',
          ai_reason: 'Non-functional street illumination poses night-time pedestrian safety risks.',
          english_summary: 'Streetlights out along market road near railway gate',
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
          photo_url: null,
          latitude: 17.4721,
          longitude: 78.4239,
          category: 'Drainage',
          priority: 'High',
          suggested_department: 'Drainage',
          ai_reason: 'Sewage overflow creates public health hazards and risks localized flooding.',
          english_summary: 'Drainage water overflow near Y junction',
          status: 'In Progress',
          admin_note: 'Suction jetting machine scheduled for clearance.',
          created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        },
        {
          id: 'demo-6',
          tracking_code: 'CF-4902',
          description: 'Dangerous crater on Road No. 12 after heavy rainfall with water filled inside.',
          location_area: 'Banjara Hills, Hyderabad',
          normalized_area: 'banjara hills',
          landmark: 'Near Minar Restaurant',
          reporter_name: 'R. K. Agarwal',
          photo_path: null,
          photo_url: null,
          latitude: 17.4156,
          longitude: 78.4357,
          category: 'Road Damage',
          priority: 'High',
          suggested_department: 'Road Maintenance',
          ai_reason: 'Submerged crater on high-speed road causes sudden vehicle damage.',
          english_summary: 'Deep water-filled pothole on Road No 12',
          status: 'Pending',
          admin_note: null,
          created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
        },
        {
          id: 'demo-7',
          tracking_code: 'CF-4911',
          description: 'Water supply line ruptured flooding commercial complex basement and lane.',
          location_area: 'Ameerpet, Hyderabad',
          normalized_area: 'ameerpet',
          landmark: 'Behind Big Bazaar',
          reporter_name: 'T. Murthy',
          photo_path: null,
          photo_url: null,
          latitude: 17.4375,
          longitude: 78.4482,
          category: 'Water Leakage',
          priority: 'High',
          suggested_department: 'Water Supply',
          ai_reason: 'Pressurized water main rupture threatens surrounding commercial basements.',
          english_summary: 'High volume water main leak behind Big Bazaar',
          status: 'In Progress',
          admin_note: 'Isolation valve turned off; pipe section being replaced.',
          created_at: new Date(Date.now() - 3600000 * 14).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: 'demo-8',
          tracking_code: 'CF-4918',
          description: 'Organic waste and market vegetable discards cleaned and sanitized successfully.',
          location_area: 'Charminar, Hyderabad',
          normalized_area: 'charminar',
          landmark: 'Near Laad Bazaar Entrance',
          reporter_name: 'A. Qureshi',
          photo_path: null,
          photo_url: null,
          latitude: 17.3616,
          longitude: 78.4747,
          category: 'Garbage',
          priority: 'Low',
          suggested_department: 'Sanitation',
          ai_reason: 'Tourist zone market waste accumulated overnight.',
          english_summary: 'Market vegetable waste cleared near Laad Bazaar',
          status: 'Resolved',
          admin_note: 'Compactor vehicle cleared waste. Bleaching powder applied.',
          created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
        },
        {
          id: 'demo-9',
          tracking_code: 'CF-4925',
          description: 'Overhead LED street lighting cluster replaced on stadium approach road.',
          location_area: 'Gachibowli, Hyderabad',
          normalized_area: 'gachibowli',
          landmark: 'Near Stadium Main Gate',
          reporter_name: 'D. Sen',
          photo_path: null,
          photo_url: null,
          latitude: 17.4401,
          longitude: 78.3489,
          category: 'Streetlights',
          priority: 'Medium',
          suggested_department: 'Street Lighting',
          ai_reason: 'High pedestrian evening traffic near sports complex.',
          english_summary: 'Defective LED fixtures replaced near stadium',
          status: 'Resolved',
          admin_note: 'New 120W LED fixtures installed and tested operational.',
          created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        {
          id: 'demo-10',
          tracking_code: 'CF-4933',
          description: 'Clogged roadside culvert overflowing with plastic debris into road gutter.',
          location_area: 'Begumpet, Hyderabad',
          normalized_area: 'begumpet',
          landmark: 'Opposite Old Airport Flyover',
          reporter_name: 'N. Prasad',
          photo_path: null,
          photo_url: null,
          latitude: 17.4447,
          longitude: 78.4664,
          category: 'Drainage',
          priority: 'Medium',
          suggested_department: 'Drainage',
          ai_reason: 'Monsoon drain bottleneck risking waterlogging on airport road.',
          english_summary: 'Plastic debris choking culvert near flyover',
          status: 'Pending',
          admin_note: null,
          created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 10).toISOString(),
        },
        {
          id: 'demo-11',
          tracking_code: 'CF-4940',
          description: 'Road surface asphalt repaving completed across Road No. 36 junction.',
          location_area: 'Jubilee Hills, Hyderabad',
          normalized_area: 'jubilee hills',
          landmark: 'Road No. 36 Metro Station',
          reporter_name: 'B. Joshi',
          photo_path: null,
          photo_url: null,
          latitude: 17.4319,
          longitude: 78.4073,
          category: 'Road Damage',
          priority: 'Medium',
          suggested_department: 'Road Maintenance',
          ai_reason: 'Surface wear near metro station bus stop.',
          english_summary: 'Bitumen resurfacing completed near metro station',
          status: 'Resolved',
          admin_note: 'Hot mix patch completed and rolled. Open to traffic.',
          created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 30).toISOString(),
        },
        {
          id: 'demo-12',
          tracking_code: 'CF-4947',
          description: 'Construction debris and stone dust dumped on pedestrian walkway.',
          location_area: 'Madhapur, Hyderabad',
          normalized_area: 'madhapur',
          landmark: 'Near 100 Feet Road Junction',
          reporter_name: 'S. Chakraborty',
          photo_path: null,
          photo_url: null,
          latitude: 17.4483,
          longitude: 78.3915,
          category: 'Garbage',
          priority: 'Medium',
          suggested_department: 'Sanitation',
          ai_reason: 'Sidewalk blockage forcing pedestrians onto active motor lanes.',
          english_summary: 'Construction debris blocking pedestrian footpath',
          status: 'In Progress',
          admin_note: 'Notice issued to builder; municipal clearance truck dispatched.',
          created_at: new Date(Date.now() - 3600000 * 19).toISOString(),
          updated_at: new Date(Date.now() - 3600000 * 7).toISOString(),
        },
      ];
    },
    load() {
      try {
        const stored = localStorage.getItem(this.KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
      const defaults = this.getDefaults();
      this.save(defaults);
      return defaults;
    },
    save(list) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(list));
      } catch {}
    },
    reset() {
      localStorage.removeItem(this.KEY);
      return this.load();
    },
    handle(url, options = {}) {
      const list = this.load();
      const method = (options.method || 'GET').toUpperCase();
      const urlObj = new URL(url, 'http://localhost');
      const pathname = urlObj.pathname;
      const searchParams = urlObj.searchParams;

      // 1. GET /api/admin/summary
      if (pathname === '/api/admin/summary') {
        const total = list.length;
        const pending = list.filter((c) => c.status === 'Pending').length;
        const in_progress = list.filter((c) => c.status === 'In Progress').length;
        const resolved = list.filter((c) => c.status === 'Resolved').length;

        const locMap = {};
        list.forEach((c) => {
          const norm = c.normalized_area || 'other';
          if (!locMap[norm]) locMap[norm] = { area: c.location_area.split(',')[0].trim(), count: 0 };
          locMap[norm].count++;
        });
        const topLocations = Object.values(locMap).sort((a, b) => b.count - a.count).slice(0, 5);

        const catMap = {};
        list.forEach((c) => { catMap[c.category] = (catMap[c.category] || 0) + 1; });
        const categories = Object.entries(catMap).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

        const mapPoints = list.filter((c) => c.latitude && c.longitude);

        return {
          success: true,
          data: {
            counts: { total, pending, in_progress, resolved },
            recent: list.slice(0, 8),
            topLocations,
            categories,
            mapPoints,
            isConfigured: true,
            isDemoMode: true,
          },
        };
      }

      // 2. GET /api/admin/complaints
      if (pathname === '/api/admin/complaints' && method === 'GET') {
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const area = searchParams.get('area');
        const search = (searchParams.get('search') || '').toLowerCase().trim();

        let filtered = [...list];
        if (status && status !== 'All') filtered = filtered.filter((c) => c.status === status);
        if (category && category !== 'All') filtered = filtered.filter((c) => c.category === category);
        if (area && area !== 'All') filtered = filtered.filter((c) => c.normalized_area === area.toLowerCase());
        if (search) {
          filtered = filtered.filter((c) =>
            c.tracking_code.toLowerCase().includes(search) ||
            c.description.toLowerCase().includes(search) ||
            c.location_area.toLowerCase().includes(search) ||
            (c.english_summary && c.english_summary.toLowerCase().includes(search))
          );
        }

        const totalCount = filtered.length;
        const totalPages = Math.ceil(totalCount / limit) || 1;
        const start = (page - 1) * limit;
        const complaints = filtered.slice(start, start + limit);

        return {
          success: true,
          data: {
            complaints,
            pagination: { page, limit, totalCount, totalPages },
          },
        };
      }

      // 3. GET /api/admin/complaints/:id
      if (pathname.startsWith('/api/admin/complaints/') && method === 'GET') {
        const id = decodeURIComponent(pathname.replace('/api/admin/complaints/', ''));
        const found = list.find((c) => c.id === id || c.tracking_code === id);
        if (!found) return { success: false, error: 'Complaint not found.' };
        return { success: true, data: found };
      }

      // 4. PATCH /api/admin/complaints/:id
      if (pathname.startsWith('/api/admin/complaints/') && method === 'PATCH') {
        const id = decodeURIComponent(pathname.replace('/api/admin/complaints/', ''));
        const idx = list.findIndex((c) => c.id === id || c.tracking_code === id);
        if (idx === -1) return { success: false, error: 'Complaint not found.' };

        let updates = {};
        try { updates = JSON.parse(options.body || '{}'); } catch {}

        if (updates.status) list[idx].status = updates.status;
        if (updates.admin_note !== undefined) list[idx].admin_note = updates.admin_note;
        if (updates.priority) list[idx].priority = updates.priority;
        if (updates.category) list[idx].category = updates.category;
        if (updates.suggested_department) list[idx].suggested_department = updates.suggested_department;
        list[idx].updated_at = new Date().toISOString();

        this.save(list);
        return { success: true, data: list[idx] };
      }

      // 5. GET /api/admin/locations
      if (pathname === '/api/admin/locations') {
        const locMap = {};
        list.forEach((item) => {
          const key = item.normalized_area || 'other';
          if (!locMap[key]) {
            locMap[key] = {
              area: item.location_area.split(',')[0].trim(),
              normalized_area: key,
              total_reports: 0,
              categories: {},
              statuses: { Pending: 0, 'In Progress': 0, Resolved: 0 },
            };
          }
          locMap[key].total_reports++;
          locMap[key].categories[item.category] = (locMap[key].categories[item.category] || 0) + 1;
          if (locMap[key].statuses[item.status] !== undefined) locMap[key].statuses[item.status]++;
        });
        const topAreas = Object.values(locMap).sort((a, b) => b.total_reports - a.total_reports).slice(0, 5);
        return {
          success: true,
          data: {
            topAreas,
            disclaimer: 'These figures count submitted reports, not verified problem frequency.',
          },
        };
      }

      // 6. GET /api/admin/map-locations
      if (pathname === '/api/admin/map-locations') {
        const points = list.filter((c) => c.latitude && c.longitude);
        return {
          success: true,
          data: {
            points,
            count: points.length,
            timestamp: new Date().toISOString(),
          },
        };
      }

      return { success: false, error: 'Endpoint unhandled' };
    },
  };

  // Helper for authenticated API requests
  async function adminFetch(url, options = {}) {
    // Demo Mode Interceptor: Uses isolated sample data; never calls or modifies production Supabase database
    if (isDemoMode) {
      const result = DemoStore.handle(url, options);
      return {
        ok: result.success !== false,
        status: result.success === false ? 404 : 200,
        json: async () => result,
      };
    }

    // Real Supabase Administrator Request
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, options);

    if (res.status === 401 || res.status === 403) {
      console.warn('Admin authentication expired or denied.');
      logout();
      throw new Error('Unauthorized');
    }

    return res;
  }

  // -------------------------------------------------------------
  // REAL-TIME LEAFLET MAP ENGINE
  // -------------------------------------------------------------
  const HYDERABAD_CENTER = [17.445, 78.405]; // Centered on northwest-central Hyderabad
  const DEFAULT_ZOOM = 12;

  let liveMap = null;
  let liveMarkerLayer = null;
  let fullLocationsMap = null;
  let fullMarkerLayer = null;
  let cachedMapPoints = [];
  let pollIntervalId = null;

  function initLiveMap() {
    const mapContainer = document.getElementById('adminLiveMap');
    if (!mapContainer) return;

    if (typeof L === 'undefined') {
      console.warn('Leaflet library not loaded, displaying fallback map.');
      const fallback = document.getElementById('mapFallbackContainer');
      if (fallback) fallback.style.display = 'block';
      return;
    }

    if (liveMap) return; // already initialized

    try {
      liveMap = L.map('adminLiveMap', {
        zoomControl: true,
        attributionControl: false,
      }).setView(HYDERABAD_CENTER, DEFAULT_ZOOM);

      // Clean OpenStreetMap tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 10,
      }).addTo(liveMap);

      liveMarkerLayer = L.layerGroup().addTo(liveMap);

      // Controls
      const btnReset = document.getElementById('btnMapResetView');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          liveMap.setView(HYDERABAD_CENTER, DEFAULT_ZOOM);
        });
      }

      const btnRefresh = document.getElementById('btnMapRefresh');
      if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
          fetchRealtimeMapPoints();
        });
      }

      // Initial render if points are already loaded
      if (cachedMapPoints.length > 0) {
        renderMapMarkers(cachedMapPoints);
      }
    } catch (e) {
      console.error('Error initializing Leaflet live map:', e);
    }
  }

  function initFullLocationsMap() {
    const fullContainer = document.getElementById('adminLocationsFullMap');
    if (!fullContainer || typeof L === 'undefined' || fullLocationsMap) return;

    try {
      fullLocationsMap = L.map('adminLocationsFullMap', {
        zoomControl: true,
        attributionControl: false,
      }).setView(HYDERABAD_CENTER, 11);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 10,
      }).addTo(fullLocationsMap);

      fullMarkerLayer = L.layerGroup().addTo(fullLocationsMap);

      const btnReset = document.getElementById('btnFullMapResetView');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          fullLocationsMap.setView(HYDERABAD_CENTER, 11);
        });
      }

      if (cachedMapPoints.length > 0) {
        renderFullMapMarkers(cachedMapPoints);
      }
    } catch (e) {
      console.error('Error initializing full location map:', e);
    }
  }

  function renderMapMarkers(points) {
    if (!points || !Array.isArray(points)) return;
    cachedMapPoints = points;

    // 1. Update live dashboard map
    if (liveMap && liveMarkerLayer) {
      liveMarkerLayer.clearLayers();

      points.forEach((item) => {
        if (!item.latitude || !item.longitude) return;

        const isResolved = item.status === 'Resolved';
        const isHigh = item.priority === 'High';
        const isMedium = item.priority === 'Medium';

        let markerClass = 'map-marker-low';
        let symbol = '●';
        if (isResolved) {
          markerClass = 'map-marker-resolved';
          symbol = '✓';
        } else if (isHigh) {
          markerClass = 'map-marker-high map-marker-pulse';
          symbol = '!';
        } else if (isMedium) {
          markerClass = 'map-marker-medium';
          symbol = '●';
        }

        const iconHtml = `<div class="map-marker-pin ${markerClass}">${symbol}</div>`;
        const customIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -14],
        });

        const statusBadge =
          item.status === 'Resolved'
            ? 'badge-resolved'
            : item.status === 'In Progress'
            ? 'badge-inprogress'
            : 'badge-pending';

        const priorityBadge =
          item.priority === 'High'
            ? 'badge-high'
            : item.priority === 'Medium'
            ? 'badge-medium'
            : 'badge-low';

        const popupContent = `
          <div class="map-popup-header">
            <code class="mono" style="font-weight: 700; color: var(--color-green);">${escapeHtml(item.tracking_code)}</code>
            <span class="badge ${statusBadge}">${escapeHtml(item.status)}</span>
          </div>
          <div class="map-popup-title">${escapeHtml(item.category)} <span class="badge ${priorityBadge}" style="font-size:10px; margin-left:4px;">${escapeHtml(item.priority)}</span></div>
          <div class="map-popup-desc">
            <strong>📍 ${escapeHtml(item.location_area)}</strong>${item.landmark ? '<br><em>Landmark: ' + escapeHtml(item.landmark) + '</em>' : ''}
            <div style="margin-top: 4px; color: var(--color-text);">${escapeHtml(item.english_summary || 'Civic report')}</div>
          </div>
          <div class="map-popup-footer">
            <span style="font-size: 10px; color: var(--color-text-muted);">${formatDate(item.created_at)}</span>
            <button type="button" class="btn btn-secondary btn-sm btn-map-popup-review" data-id="${escapeHtml(item.id)}" style="padding: 2px 8px; font-size: 11px;">
              Review →
            </button>
          </div>
        `;

        const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });
        marker.bindPopup(popupContent, { maxWidth: 280 });
        liveMarkerLayer.addLayer(marker);
      });
    }

    // 2. Update full location map if initialized
    if (fullLocationsMap && fullMarkerLayer) {
      renderFullMapMarkers(points);
    }

    // 3. Update counter & pulse indicator
    const countEl = document.getElementById('mapActivePointsCount');
    if (countEl) {
      countEl.textContent = `${points.length} active pins`;
    }

    const liveDot = document.getElementById('mapLiveDot');
    if (liveDot) {
      liveDot.style.opacity = '0.3';
      setTimeout(() => {
        liveDot.style.opacity = '1';
      }, 300);
    }
  }

  function renderFullMapMarkers(points) {
    if (!fullLocationsMap || !fullMarkerLayer) return;
    fullMarkerLayer.clearLayers();

    points.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const isResolved = item.status === 'Resolved';
      const isHigh = item.priority === 'High';
      const isMedium = item.priority === 'Medium';

      let markerClass = isResolved
        ? 'map-marker-resolved'
        : isHigh
        ? 'map-marker-high map-marker-pulse'
        : isMedium
        ? 'map-marker-medium'
        : 'map-marker-low';

      const customIcon = L.divIcon({
        html: `<div class="map-marker-pin ${markerClass}">${isResolved ? '✓' : isHigh ? '!' : '●'}</div>`,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });
      marker.bindPopup(`
        <strong>${escapeHtml(item.tracking_code)} — ${escapeHtml(item.category)}</strong><br>
        📍 ${escapeHtml(item.location_area)}<br>
        <span style="font-size:11px; color:#555;">${escapeHtml(item.english_summary)}</span>
      `);
      fullMarkerLayer.addLayer(marker);
    });
  }

  // Delegate click for popup "Review →" button
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-map-popup-review');
    if (btn) {
      const id = btn.getAttribute('data-id');
      if (id) openComplaintModal(id);
    }
  });

  // Fetch real-time map points from API
  async function fetchRealtimeMapPoints() {
    try {
      const res = await adminFetch('/api/admin/map-locations');
      const json = await res.json();
      if (json.success && json.data && json.data.points) {
        renderMapMarkers(json.data.points);
      }
    } catch (err) {
      console.warn('Real-time map poll warning:', err.message);
    }
  }

  // Periodic polling every 10 seconds for real-time updates
  function startRealtimeMapPolling() {
    if (pollIntervalId) clearInterval(pollIntervalId);
    pollIntervalId = setInterval(() => {
      // Only fetch when document is visible
      if (!document.hidden) {
        fetchRealtimeMapPoints();
      }
    }, 10000);
  }

  // -------------------------------------------------------------
  // TAB NAVIGATION CONTROLLER
  // -------------------------------------------------------------
  const VALID_TABS = [
    'dashboard',
    'complaints',
    'locations',
    'ai-analytics',
    'reports',
    'departments',
    'users',
    'settings',
  ];

  let currentTab = 'dashboard';

  function switchAdminTab(tabName, updateUrl = true) {
    if (!VALID_TABS.includes(tabName)) {
      tabName = 'dashboard';
    }

    currentTab = tabName;

    // 1. Highlight nav items
    document.querySelectorAll('.admin-nav-item').forEach((item) => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 2. Toggle active panel
    document.querySelectorAll('.admin-panel').forEach((panel) => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(`panel-${tabName}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // 3. Update URL without full page reload
    if (updateUrl) {
      const url = new URL(window.location);
      url.searchParams.set('tab', tabName);
      history.pushState({ tab: tabName }, '', url);
    }

    // 4. Close mobile sidebar if open
    if (sidebar && window.innerWidth <= 860) {
      sidebar.classList.remove('open');
    }

    // 5. Invalidate map sizes so Leaflet recalibrates container bounds
    setTimeout(() => {
      if (tabName === 'dashboard' && liveMap) {
        liveMap.invalidateSize();
      } else if (tabName === 'locations') {
        initFullLocationsMap();
        if (fullLocationsMap) fullLocationsMap.invalidateSize();
      }
    }, 150);

    // 6. Trigger view-specific data refresh
    if (tabName === 'dashboard') {
      loadDashboard();
    } else if (tabName === 'complaints') {
      loadComplaints(1);
    } else if (tabName === 'locations') {
      loadLocations();
    } else if (tabName === 'departments') {
      loadDepartments();
    } else if (tabName === 'settings') {
      loadSettings();
    }
  }

  // Register nav clicks
  document.querySelectorAll('.admin-nav-item[data-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = btn.getAttribute('data-tab');
      switchAdminTab(tab);
    });
  });

  // Link on Recent Complaints table to jump to Complaints panel
  const linkViewAll = document.getElementById('linkViewAllComplaints');
  if (linkViewAll) {
    linkViewAll.addEventListener('click', (e) => {
      e.preventDefault();
      switchAdminTab('complaints');
    });
  }

  // Initial tab resolution on page load
  function determineInitialTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const queryTab = urlParams.get('tab');
    if (queryTab && VALID_TABS.includes(queryTab)) return queryTab;

    const hashTab = window.location.hash.replace(/^#/, '');
    if (hashTab && VALID_TABS.includes(hashTab)) return hashTab;

    const path = window.location.pathname.replace(/\/$/, '');
    if (path === '/admin/complaints') return 'complaints';
    if (path === '/admin/locations') return 'locations';

    return 'dashboard';
  }

  window.addEventListener('popstate', (e) => {
    const stateTab = e.state?.tab || determineInitialTab();
    switchAdminTab(stateTab, false);
  });

  // -------------------------------------------------------------
  // 1. DASHBOARD VIEW DATA LOADER
  // -------------------------------------------------------------
  async function loadDashboard() {
    const statTotal = document.getElementById('admStatTotal');
    const statPending = document.getElementById('admStatPending');
    const statInProgress = document.getElementById('admStatInProgress');
    const statResolved = document.getElementById('admStatResolved');
    const topAreasContainer = document.getElementById('topAreasContainer');
    const categoryChartContainer = document.getElementById('categoryChartContainer');
    const recentTableBody = document.getElementById('recentTableBody');

    try {
      const res = await adminFetch('/api/admin/summary');
      const json = await res.json();

      if (json.success && json.data) {
        const { counts, recent, topLocations, categories, mapPoints } = json.data;

        // Metric numbers
        if (counts) {
          if (statTotal) statTotal.textContent = counts.total ?? 0;
          if (statPending) statPending.textContent = counts.pending ?? 0;
          if (statInProgress) statInProgress.textContent = counts.in_progress ?? 0;
          if (statResolved) statResolved.textContent = counts.resolved ?? 0;
        }

        // Top Locations Bars
        if (topAreasContainer) {
          if (topLocations && topLocations.length > 0) {
            const maxCount = Math.max(...topLocations.map((l) => l.count), 1);
            topAreasContainer.innerHTML = topLocations
              .map((loc) => {
                const pct = Math.round((loc.count / maxCount) * 100);
                return `
                  <div class="admin-bar-row">
                    <span class="admin-bar-label" title="${escapeHtml(loc.area)}">${escapeHtml(loc.area)}</span>
                    <div class="admin-bar-track">
                      <div class="admin-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <span class="admin-bar-count">${loc.count}</span>
                  </div>
                `;
              })
              .join('');
          } else {
            topAreasContainer.innerHTML = `<div style="color: var(--color-text-muted); font-size: 12px; padding: 12px 0;">No location records available.</div>`;
          }
        }

        // Category Distribution Donut Chart
        if (categoryChartContainer) {
          renderCategoryDonutChart(categoryChartContainer, categories, counts ? counts.total : 0);
        }

        // Real-Time Map Plotting
        if (mapPoints && Array.isArray(mapPoints)) {
          initLiveMap();
          renderMapMarkers(mapPoints);
        }

        // Recent Complaints Table
        if (recentTableBody) {
          if (recent && recent.length > 0) {
            recentTableBody.innerHTML = recent
              .slice(0, 5)
              .map((item) => {
                const statusBadge =
                  item.status === 'Resolved'
                    ? 'badge-resolved'
                    : item.status === 'In Progress'
                    ? 'badge-inprogress'
                    : 'badge-pending';

                const hasPhoto = Boolean(item.photo_url || item.photo_path || item.has_photo);
                const photoIcon = hasPhoto
                  ? `<span title="Citizen attached photo evidence" style="background: #E0F2FE; color: #0284C7; font-size: 10px; font-weight: 600; padding: 2px 5px; border-radius: 4px; border: 1px solid #BAE6FD; margin-left: 6px; display: inline-flex; align-items: center; gap: 2px;">📷</span>`
                  : '';

                return `
                  <tr style="cursor: pointer;" class="recent-row" data-id="${escapeHtml(item.id)}">
                    <td>
                      <div style="display: inline-flex; align-items: center;">
                        <code class="mono" style="font-weight: 700; color: var(--color-green);">${escapeHtml(item.tracking_code)}</code>
                        ${photoIcon}
                      </div>
                    </td>
                    <td><span style="font-weight: 600; color: var(--color-text);">${escapeHtml(item.english_summary || item.description || 'Civic issue')}</span></td>
                    <td>
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <i data-lucide="map-pin" class="icon-16" style="color: var(--color-text-muted);"></i>
                        ${escapeHtml(item.location_area)}
                      </span>
                    </td>
                    <td><span class="badge ${statusBadge}">${escapeHtml(item.status)}</span></td>
                  </tr>
                `;
              })
              .join('');

            if (window.initIcons) {
              window.initIcons();
            }

            document.querySelectorAll('.recent-row').forEach((row) => {
              row.addEventListener('click', () => {
                const id = row.getAttribute('data-id');
                openComplaintModal(id);
              });
            });
          } else {
            recentTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted); padding: 20px;">No complaints recorded yet.</td></tr>`;
          }
        }
      }
    } catch (err) {
      console.error('Dashboard init error:', err);
    }
  }

  function renderCategoryDonutChart(container, categories, totalCount) {
    if (!categories || categories.length === 0) {
      container.innerHTML = '<div style="color: var(--color-text-muted); font-size: 12px;">No categorized reports recorded yet.</div>';
      return;
    }

    const palette = [
      '#167D70', // Teal Green (Road Damage)
      '#F59E0B', // Amber (Sanitation)
      '#3B82F6', // Blue (Water Supply)
      '#10B981', // Green (Street Light)
      '#8B5CF6', // Purple (Drainage)
      '#9CA3AF', // Gray (Others)
    ];

    const total = totalCount || categories.reduce((sum, c) => sum + c.count, 0) || 1;
    const radius = 46;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPct = 0;
    let circlesSvg = '';
    let legendHtml = '';

    categories.forEach((cat, idx) => {
      const color = palette[idx % palette.length];
      const count = cat.count;
      const pct = Math.round((count / total) * 100);
      const strokeDash = (pct / 100) * circumference;
      const strokeOffset = (accumulatedPct / 100) * circumference;

      circlesSvg += `<circle cx="70" cy="70" r="${radius}" fill="transparent" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash} ${circumference}" stroke-dashoffset="-${strokeOffset}"></circle>`;
      accumulatedPct += pct;

      legendHtml += `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 5px; font-size: 12px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; display: inline-block;"></span>
            <span style="color: var(--color-text);">${escapeHtml(cat.category)}</span>
          </div>
          <strong style="color: var(--color-text); font-family: var(--font-mono);">${pct}%</strong>
        </div>
      `;
    });

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-around; width: 100%; flex-wrap: wrap; gap: 16px;">
        <div style="position: relative; width: 140px; height: 140px; flex-shrink: 0;">
          <svg width="140" height="140" viewBox="0 0 140 140" style="transform: rotate(-90deg);">
            <circle cx="70" cy="70" r="${radius}" fill="transparent" stroke="#E2E8E6" stroke-width="${strokeWidth}"></circle>
            ${circlesSvg}
          </svg>
          <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
            <span style="font-size: 22px; font-weight: 800; color: var(--color-text); line-height: 1;">${total}</span>
            <span style="font-size: 10px; color: var(--color-text-muted); text-transform: uppercase; font-weight: 600;">Issues</span>
          </div>
        </div>
        <div style="flex: 1; min-width: 140px;">
          ${legendHtml}
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // 2. COMPLAINTS MANAGEMENT CONTROLLER
  // -------------------------------------------------------------
  let currentPage = 1;
  let currentComplaintId = null;
  let searchTimeout = null;

  const tbody = document.getElementById('adminComplaintsTbody');
  const searchInput = document.getElementById('adminSearchInput');
  const categoryFilter = document.getElementById('adminCategoryFilter');
  const statusFilter = document.getElementById('adminStatusFilter');
  const btnReset = document.getElementById('btnAdminReset');
  const pageInfo = document.getElementById('adminPageInfo');
  const btnPrev = document.getElementById('btnAdminPrev');
  const btnNext = document.getElementById('btnAdminNext');

  async function loadComplaints(page = 1) {
    currentPage = page;
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--color-text-muted);">Loading complaints...</td></tr>`;
    }

    const params = new URLSearchParams({ page, limit: 15 });
    const cat = categoryFilter ? categoryFilter.value : 'All';
    if (cat && cat !== 'All') params.append('category', cat);
    const stat = statusFilter ? statusFilter.value : 'All';
    if (stat && stat !== 'All') params.append('status', stat);
    const q = searchInput ? searchInput.value.trim() : '';
    if (q) params.append('search', q);

    // If demo mode AND live feed is selected: load from safe public GET /api/issues
    if (isDemoMode && demoViewMode === 'live') {
      try {
        const res = await fetch(`/api/issues?${params.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
          const issues = json.data.issues || [];
          livePublicComplaints = issues;
          renderComplaintsTable(issues, true);
          renderPagination(json.data.pagination || { page, limit: 15, totalCount: issues.length, totalPages: 1 });
        } else {
          if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load live public complaints.</td></tr>`;
        }
      } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading live complaints.</td></tr>`;
      }
      return;
    }

    // Default: Sandbox mode in demo, or real adminFetch for authenticated admins
    try {
      const res = await adminFetch(`/api/admin/complaints?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        renderComplaintsTable(json.data.complaints, false);
        renderPagination(json.data.pagination);
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load data.</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading complaints.</td></tr>`;
    }
  }

  function renderComplaintsTable(complaints, isLive = false) {
    if (!tbody) return;
    if (!complaints || complaints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted); padding: 24px;">No complaints match the criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = complaints
      .map((item) => {
        const statusBadge =
          item.status === 'Resolved'
            ? 'badge-resolved'
            : item.status === 'In Progress'
            ? 'badge-inprogress'
            : 'badge-pending';

        const priorityClass =
          item.priority === 'High'
            ? 'badge-high'
            : item.priority === 'Medium'
            ? 'badge-medium'
            : 'badge-low';

        const hasPhoto = Boolean(item.photo_url || item.photo_path || item.has_photo);
        const photoBadge = hasPhoto
          ? `<span class="badge" title="Citizen uploaded photo evidence" style="background-color: #E0F2FE; color: #0284C7; border: 1px solid #BAE6FD; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px; margin-left: 6px;">📷 Photo</span>`
          : '';

        const liveBadge = isLive
          ? `<span class="badge" title="Live citizen submission via public portal" style="background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-left: 4px;">📡 Live Citizen</span>`
          : '';

        const identifier = isLive ? item.tracking_code : item.id;

        return `
          <tr>
            <td>
              <div style="display: inline-flex; align-items: center; flex-wrap: wrap;">
                <code class="mono" style="font-weight: 700; color: var(--color-green);">${escapeHtml(item.tracking_code)}</code>
                ${photoBadge}
                ${liveBadge}
              </div>
            </td>
            <td><strong>${escapeHtml(item.location_area)}</strong></td>
            <td style="max-width: 240px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(item.english_summary || item.description)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td><span class="badge ${priorityClass}">${escapeHtml(item.priority)}</span></td>
            <td><span class="badge ${statusBadge}">${escapeHtml(item.status)}</span></td>
            <td style="font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${formatDate(item.created_at)}</td>
            <td>
              <button type="button" class="btn btn-secondary btn-sm btn-open-modal" data-id="${escapeHtml(identifier)}" data-live="${isLive ? 'true' : 'false'}">Review</button>
            </td>
          </tr>
        `;
      })
      .join('');

    document.querySelectorAll('.btn-open-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const isLive = btn.getAttribute('data-live') === 'true';
        openComplaintModal(id, isLive);
      });
    });
  }

  function renderPagination(pagination) {
    if (!pagination) return;
    const { page, totalPages, totalCount } = pagination;
    if (pageInfo) pageInfo.textContent = `Page ${page} of ${Math.max(totalPages, 1)} (${totalCount} total)`;
    if (btnPrev) btnPrev.disabled = page <= 1;
    if (btnNext) btnNext.disabled = page >= totalPages;
  }

  if (categoryFilter) categoryFilter.addEventListener('change', () => loadComplaints(1));
  if (statusFilter) statusFilter.addEventListener('change', () => loadComplaints(1));

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadComplaints(1), 350);
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categoryFilter) categoryFilter.value = 'All';
      if (statusFilter) statusFilter.value = 'All';
      loadComplaints(1);
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      if (currentPage > 1) loadComplaints(currentPage - 1);
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      loadComplaints(currentPage + 1);
    });
  }

  // -------------------------------------------------------------
  // 3. COMPLAINT MODAL (Shared Review & Status Update)
  // -------------------------------------------------------------
  const modal = document.getElementById('complaintModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const modalTrackingCode = document.getElementById('modalTrackingCode');
  const modalArea = document.getElementById('modalArea');
  const modalLandmark = document.getElementById('modalLandmark');
  const modalReporter = document.getElementById('modalReporter');
  const modalDate = document.getElementById('modalDate');
  const modalDescription = document.getElementById('modalDescription');
  const modalPhotoSection = document.getElementById('modalPhotoSection');
  const modalPhotoImg = document.getElementById('modalPhotoImg');
  const modalPhotoLink = document.getElementById('modalPhotoLink');
  const modalAiReason = document.getElementById('modalAiReason');
  const modalAiSummary = document.getElementById('modalAiSummary');
  const modalStatusSelect = document.getElementById('modalStatusSelect');
  const modalPrioritySelect = document.getElementById('modalPrioritySelect');
  const modalCategorySelect = document.getElementById('modalCategorySelect');
  const modalDeptInput = document.getElementById('modalDeptInput');
  const modalAdminNote = document.getElementById('modalAdminNote');
  const modalUpdateForm = document.getElementById('modalUpdateForm');
  const modalAlert = document.getElementById('modalAlert');
  const btnSaveComplaint = document.getElementById('btnSaveComplaint');

  async function openComplaintModal(id, isLive = false) {
    currentComplaintId = id;
    if (modalAlert) modalAlert.style.display = 'none';
    const liveNotice = document.getElementById('modalLiveDemoNotice');

    // Case 1: Live Public Feed in Demo Mode (Read-Only)
    if (isLive || (isDemoMode && demoViewMode === 'live')) {
      isCurrentComplaintLive = true;
      const found = livePublicComplaints.find((c) => c.tracking_code === id || c.id === id);
      if (!found) {
        alert('Complaint details could not be found in live public feed.');
        return;
      }

      if (modalTrackingCode) modalTrackingCode.textContent = found.tracking_code;
      if (modalArea) modalArea.textContent = found.location_area || 'Hyderabad';
      if (modalLandmark) modalLandmark.textContent = 'Protected (Omitted in public feed)';
      if (modalReporter) modalReporter.textContent = 'Anonymous Citizen';
      if (modalDate) modalDate.textContent = formatDate(found.created_at);
      if (modalDescription) modalDescription.textContent = found.english_summary || 'Citizen reported civic issue';

      // Photos strictly omitted in public feed
      if (modalPhotoSection) modalPhotoSection.style.display = 'none';

      if (modalAiReason) modalAiReason.textContent = `Reported anonymously via public portal. Classified under ${found.category} with ${found.priority} priority.`;
      if (modalAiSummary) modalAiSummary.textContent = found.english_summary || 'Civic issue report';

      // Disable editing controls for live public complaints in demo mode
      if (modalStatusSelect) {
        modalStatusSelect.value = found.status || 'Pending';
        modalStatusSelect.disabled = true;
      }
      if (modalPrioritySelect) {
        modalPrioritySelect.value = found.priority || 'Medium';
        modalPrioritySelect.disabled = true;
      }
      if (modalCategorySelect) {
        modalCategorySelect.value = found.category || 'Unclassified';
        modalCategorySelect.disabled = true;
      }
      if (modalDeptInput) {
        modalDeptInput.value = found.category || '';
        modalDeptInput.disabled = true;
      }
      if (modalAdminNote) {
        modalAdminNote.value = '';
        modalAdminNote.placeholder = 'Internal administrative notes are protected in public view.';
        modalAdminNote.disabled = true;
      }

      if (btnSaveComplaint) btnSaveComplaint.style.display = 'none';
      if (liveNotice) liveNotice.style.display = 'block';

      if (modal) modal.style.display = 'flex';
      return;
    }

    // Case 2: Interactive Sandbox or Real Authenticated Admin
    isCurrentComplaintLive = false;
    if (liveNotice) liveNotice.style.display = 'none';
    if (btnSaveComplaint) {
      btnSaveComplaint.style.display = 'inline-block';
      btnSaveComplaint.disabled = false;
    }
    if (modalStatusSelect) modalStatusSelect.disabled = false;
    if (modalPrioritySelect) modalPrioritySelect.disabled = false;
    if (modalCategorySelect) modalCategorySelect.disabled = false;
    if (modalDeptInput) modalDeptInput.disabled = false;
    if (modalAdminNote) {
      modalAdminNote.disabled = false;
      modalAdminNote.placeholder = 'Record actions taken by field team...';
    }

    try {
      const res = await adminFetch(`/api/admin/complaints/${encodeURIComponent(id)}`);
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        if (modalTrackingCode) modalTrackingCode.textContent = d.tracking_code;
        if (modalArea) modalArea.textContent = d.location_area;
        if (modalLandmark) modalLandmark.textContent = d.landmark || 'None provided';
        if (modalReporter) modalReporter.textContent = d.reporter_name || 'Anonymous citizen';
        if (modalDate) modalDate.textContent = formatDate(d.created_at);
        if (modalDescription) modalDescription.textContent = d.description;

        // Citizen Photo Evidence Resolver
        if (modalPhotoSection && modalPhotoImg) {
          const resolvedPhotoUrl = d.photo_url || (d.photo_path ? (d.photo_path.startsWith('/') ? d.photo_path : `/${d.photo_path}`) : null);

          if (resolvedPhotoUrl) {
            modalPhotoImg.src = resolvedPhotoUrl;
            modalPhotoImg.alt = `Citizen photo evidence for ${d.tracking_code}`;
            if (modalPhotoLink) modalPhotoLink.href = resolvedPhotoUrl;
            modalPhotoSection.style.display = 'block';
          } else {
            modalPhotoImg.src = '';
            modalPhotoSection.style.display = 'none';
          }
        }

        if (modalAiReason) modalAiReason.textContent = d.ai_reason || 'No AI reason provided';
        if (modalAiSummary) modalAiSummary.textContent = d.english_summary || 'No English summary available';

        if (modalStatusSelect) modalStatusSelect.value = d.status || 'Pending';
        if (modalPrioritySelect) modalPrioritySelect.value = d.priority || 'Needs review';
        if (modalCategorySelect) modalCategorySelect.value = d.category || 'Unclassified';
        if (modalDeptInput) modalDeptInput.value = d.suggested_department || '';
        if (modalAdminNote) modalAdminNote.value = d.admin_note || '';

        if (modal) modal.style.display = 'flex';
      }
    } catch (err) {
      alert('Failed to load complaint details.');
    }
  }

  function closeModal() {
    if (modal) modal.style.display = 'none';
    currentComplaintId = null;
    isCurrentComplaintLive = false;
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  if (modalUpdateForm) {
    modalUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentComplaintId) return;

      // Guard: Never allow status updates on live complaints in demo mode
      if (isCurrentComplaintLive) {
        modalAlert.className = 'alert alert-error';
        modalAlert.textContent = 'Status updates on live citizen complaints are disabled in Demo Mode to protect production data.';
        modalAlert.style.display = 'block';
        return;
      }

      btnSaveComplaint.disabled = true;
      btnSaveComplaint.textContent = 'Saving...';
      if (modalAlert) modalAlert.style.display = 'none';

      const updates = {
        status: modalStatusSelect.value,
        priority: modalPrioritySelect.value,
        category: modalCategorySelect.value,
        suggested_department: modalDeptInput.value.trim(),
        admin_note: modalAdminNote.value.trim(),
      };

      try {
        const res = await adminFetch(`/api/admin/complaints/${encodeURIComponent(currentComplaintId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const json = await res.json();

        if (res.ok && json.success) {
          modalAlert.className = 'alert alert-success';
          modalAlert.textContent = isDemoMode
            ? `Status updated to "${updates.status || 'Updated'}" (Demo Sandbox: Live Supabase unaffected).`
            : 'Changes saved successfully to database.';
          modalAlert.style.display = 'block';

          setTimeout(() => {
            closeModal();
            loadComplaints(currentPage);
            loadDashboard(); // Refresh stats cards and map
            fetchRealtimeMapPoints();
          }, 600);
        } else {
          modalAlert.className = 'alert alert-error';
          modalAlert.textContent = json.error || 'Failed to update complaint.';
          modalAlert.style.display = 'block';
        }
      } catch (err) {
        modalAlert.className = 'alert alert-error';
        modalAlert.textContent = 'Network error while updating record.';
        modalAlert.style.display = 'block';
      } finally {
        btnSaveComplaint.disabled = false;
        btnSaveComplaint.textContent = 'Save Changes';
      }
    });
  }

  // -------------------------------------------------------------
  // 4. LOCATION ANALYSIS VIEW LOADER
  // -------------------------------------------------------------
  async function loadLocations() {
    const locPageTopBars = document.getElementById('locPageTopBars');
    const areaBreakdownList = document.getElementById('areaBreakdownList');

    try {
      const res = await adminFetch('/api/admin/locations');
      const json = await res.json();

      if (json.success && json.data) {
        const topAreas = json.data.topAreas || [];

        if (topAreas.length === 0) {
          if (locPageTopBars) locPageTopBars.innerHTML = `<div style="color: var(--color-text-muted); font-size: 12px; padding: 12px 0;">No locality data recorded yet.</div>`;
          if (areaBreakdownList) areaBreakdownList.innerHTML = `<div style="color: var(--color-text-muted); font-size: 12px; padding: 12px 0;">No locality reports found.</div>`;
          return;
        }

        const maxTotal = Math.max(...topAreas.map((a) => a.total_reports), 1);

        if (locPageTopBars) {
          locPageTopBars.innerHTML = topAreas
            .map((item) => {
              const pct = Math.round((item.total_reports / maxTotal) * 100);
              return `
                <div class="admin-bar-row">
                  <span class="admin-bar-label" title="${escapeHtml(item.area)}">${escapeHtml(item.area)}</span>
                  <div class="admin-bar-track">
                    <div class="admin-bar-fill" style="width: ${pct}%;"></div>
                  </div>
                  <span class="admin-bar-count">${item.total_reports}</span>
                </div>
              `;
            })
            .join('');

          if (window.initIcons) {
            window.initIcons();
          }
        }

        if (areaBreakdownList) {
          areaBreakdownList.innerHTML = topAreas
            .map((item) => {
              const catEntries = Object.entries(item.categories || {})
                .map(([cat, count]) => `<span class="badge" style="background-color: var(--color-offwhite); border: 1px solid var(--color-border); color: var(--color-text); margin-right: 6px; margin-bottom: 4px;">${escapeHtml(cat)}: ${count}</span>`)
                .join('');

              const statusEntries = Object.entries(item.statuses || {})
                .map(([stat, count]) => {
                  const cls = stat === 'Resolved' ? 'badge-resolved' : stat === 'In Progress' ? 'badge-inprogress' : 'badge-pending';
                  return `<span class="badge ${cls}" style="margin-right: 6px;">${stat}: ${count}</span>`;
                })
                .join('');

              return `
                <div style="border: 1px solid var(--color-border); border-radius: var(--radius-btn); padding: 14px 16px; margin-bottom: 12px; background-color: var(--color-white);">
                  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; flex-wrap: wrap;">
                    <h4 style="font-size: 15px; margin-bottom: 0; display: inline-flex; align-items: center; gap: 6px;">
                      <i data-lucide="map-pin" class="icon-16" style="color: var(--color-green);"></i>
                      ${escapeHtml(item.area)} 
                      <span style="font-size: 11px; font-weight: 400; color: var(--color-text-muted);">(normalized: "${escapeHtml(item.normalized_area)}")</span>
                    </h4>
                    <span style="font-weight: 700; font-size: 14px; color: var(--color-green);">${item.total_reports} total complaints</span>
                  </div>

                  <div style="margin-bottom: 6px;">
                    <span style="font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Issue Types</span>
                    <div>${catEntries || '<em>None</em>'}</div>
                  </div>

                  <div>
                    <span style="font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Resolution Status</span>
                    <div>${statusEntries || '<em>None</em>'}</div>
                  </div>
                </div>
              `;
            })
            .join('');

          if (window.initIcons) {
            window.initIcons();
          }
        }
      }
    } catch (err) {
      console.error('Location page error:', err);
    }
  }

  // -------------------------------------------------------------
  // 5. DEPARTMENTS VIEW LOADER
  // -------------------------------------------------------------
  async function loadDepartments() {
    try {
      const res = await adminFetch('/api/admin/summary');
      const json = await res.json();
      if (json.success && json.data && json.data.categories) {
        const catMap = {};
        json.data.categories.forEach((c) => {
          catMap[c.category] = c.count;
        });

        const elRoads = document.getElementById('deptCountRoads');
        const elGarbage = document.getElementById('deptCountGarbage');
        const elWater = document.getElementById('deptCountWater');
        const elLight = document.getElementById('deptCountLight');

        if (elRoads) elRoads.textContent = catMap['Road Damage'] || 0;
        if (elGarbage) elGarbage.textContent = catMap['Garbage'] || 0;
        if (elWater) elWater.textContent = (catMap['Water Leakage'] || 0) + (catMap['Drainage'] || 0);
        if (elLight) elLight.textContent = (catMap['Streetlights'] || catMap['Street Light'] || 0);
      }
    } catch (err) {
      console.error('Dept load error:', err);
    }
  }

  // -------------------------------------------------------------
  // 6. REPORTS CSV EXPORT
  // -------------------------------------------------------------
  const btnExportCsv = document.getElementById('btnExportCsv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', async () => {
      btnExportCsv.disabled = true;
      btnExportCsv.textContent = 'Generating CSV...';

      try {
        const res = await adminFetch('/api/admin/complaints?limit=1000');
        const json = await res.json();

        if (json.success && json.data && json.data.complaints) {
          const list = json.data.complaints;
          const headers = ['Tracking Code', 'Location', 'Landmark', 'Category', 'Priority', 'Status', 'Reporter', 'Created At', 'Description', 'AI Summary'];
          const rows = list.map((c) => [
            `"${(c.tracking_code || '').replace(/"/g, '""')}"`,
            `"${(c.location_area || '').replace(/"/g, '""')}"`,
            `"${(c.landmark || '').replace(/"/g, '""')}"`,
            `"${(c.category || '').replace(/"/g, '""')}"`,
            `"${(c.priority || '').replace(/"/g, '""')}"`,
            `"${(c.status || '').replace(/"/g, '""')}"`,
            `"${(c.reporter_name || '').replace(/"/g, '""')}"`,
            `"${(c.created_at || '').replace(/"/g, '""')}"`,
            `"${(c.description || '').replace(/"/g, '""')}"`,
            `"${(c.english_summary || '').replace(/"/g, '""')}"`,
          ]);

          const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `civicfix_complaints_export_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          alert('Failed to retrieve complaints for export.');
        }
      } catch (err) {
        alert('Error generating CSV export.');
      } finally {
        btnExportCsv.disabled = false;
        btnExportCsv.textContent = '📥 Export CSV';
      }
    });
  }

  // -------------------------------------------------------------
  // 7. SETTINGS & SYSTEM STATUS VIEW LOADER
  // -------------------------------------------------------------
  async function loadSettings() {
    const elStorage = document.getElementById('settingsStorageStatus');
    const elAi = document.getElementById('settingsAiStatus');

    try {
      const res = await fetch('/api/system-status');
      const json = await res.json();
      if (json.success && json.data) {
        const { supabaseConnected, geminiConfigured } = json.data;

        if (elStorage) {
          if (supabaseConnected) {
            elStorage.className = 'badge badge-resolved';
            elStorage.textContent = 'Supabase Cloud (Connected)';
          } else {
            elStorage.className = 'badge badge-medium';
            elStorage.textContent = 'Offline Demo Store (Active)';
          }
        }

        if (elAi) {
          if (geminiConfigured) {
            elAi.className = 'badge badge-resolved';
            elAi.textContent = 'Google Gemini 2.5 (Configured)';
          } else {
            elAi.className = 'badge badge-inprogress';
            elAi.textContent = 'Vernacular NLP Fallback (Ready)';
          }
        }
      }
    } catch {}
  }

  const btnRefreshData = document.getElementById('btnRefreshData');
  if (btnRefreshData) {
    btnRefreshData.addEventListener('click', () => {
      loadDashboard();
      loadComplaints(1);
      loadLocations();
      loadDepartments();
      loadSettings();
      fetchRealtimeMapPoints();
      alert('Live telemetry, complaints and real-time map refreshed from database.');
    });
  }

  // -------------------------------------------------------------
  // INITIALIZE STARTING TAB & REAL-TIME POLLING
  // -------------------------------------------------------------
  const initialTab = determineInitialTab();
  switchAdminTab(initialTab, false);
  startRealtimeMapPolling();
});
