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

  // Helper for authenticated API requests
  async function adminFetch(url, options = {}) {
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

                return `
                  <tr style="cursor: pointer;" class="recent-row" data-id="${escapeHtml(item.id)}">
                    <td><code class="mono" style="font-weight: 700; color: var(--color-green);">${escapeHtml(item.tracking_code)}</code></td>
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
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--color-text-muted);">Loading complaints from database...</td></tr>`;
    }

    const params = new URLSearchParams({ page, limit: 15 });
    const cat = categoryFilter ? categoryFilter.value : 'All';
    if (cat && cat !== 'All') params.append('category', cat);
    const stat = statusFilter ? statusFilter.value : 'All';
    if (stat && stat !== 'All') params.append('status', stat);
    const q = searchInput ? searchInput.value.trim() : '';
    if (q) params.append('search', q);

    try {
      const res = await adminFetch(`/api/admin/complaints?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        renderComplaintsTable(json.data.complaints);
        renderPagination(json.data.pagination);
      } else {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load data.</td></tr>`;
      }
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading complaints.</td></tr>`;
    }
  }

  function renderComplaintsTable(complaints) {
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

        return `
          <tr>
            <td><code class="mono" style="font-weight: 700; color: var(--color-green);">${escapeHtml(item.tracking_code)}</code></td>
            <td><strong>${escapeHtml(item.location_area)}</strong></td>
            <td style="max-width: 240px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(item.english_summary || item.description)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td><span class="badge ${priorityClass}">${escapeHtml(item.priority)}</span></td>
            <td><span class="badge ${statusBadge}">${escapeHtml(item.status)}</span></td>
            <td style="font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">${formatDate(item.created_at)}</td>
            <td>
              <button type="button" class="btn btn-secondary btn-sm btn-open-modal" data-id="${escapeHtml(item.id)}">Review</button>
            </td>
          </tr>
        `;
      })
      .join('');

    document.querySelectorAll('.btn-open-modal').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openComplaintModal(id);
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

  async function openComplaintModal(id) {
    currentComplaintId = id;
    if (modalAlert) modalAlert.style.display = 'none';

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

        if (modalPhotoSection && modalPhotoImg) {
          if (d.photo_url) {
            modalPhotoImg.src = d.photo_url;
            if (modalPhotoLink) modalPhotoLink.href = d.photo_url;
            modalPhotoSection.style.display = 'block';
          } else {
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
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  if (modalUpdateForm) {
    modalUpdateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentComplaintId) return;

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
          modalAlert.textContent = 'Changes saved successfully to database.';
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
        if (elLight) elLight.textContent = catMap['Street Light'] || 0;
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
