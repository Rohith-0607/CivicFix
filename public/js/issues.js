// CivicFix AI — Public Issues Board Logic

document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  const limit = 15;
  let searchTimeout = null;

  const countTotal = document.getElementById('countTotal');
  const countPending = document.getElementById('countPending');
  const countInProgress = document.getElementById('countInProgress');
  const countResolved = document.getElementById('countResolved');

  const filterSearch = document.getElementById('filterSearch');
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');
  const btnResetFilters = document.getElementById('btnResetFilters');

  const issuesTable = document.getElementById('issuesTable');
  const issuesTableBody = document.getElementById('issuesTableBody');
  const emptyNotice = document.getElementById('emptyNotice');

  const pageInfo = document.getElementById('pageInfo');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');

  const btnViewList = document.getElementById('btnViewList');
  const btnViewMap = document.getElementById('btnViewMap');
  const listViewContainer = document.getElementById('listViewContainer');
  const mapViewContainer = document.getElementById('mapViewContainer');

  let publicMap = null;
  let publicMarkerLayer = null;
  let cachedIssuesForMap = [];

  const HYDERABAD_DEFAULT_CENTER = [17.445, 78.405];

  function initPublicMap() {
    const mapEl = document.getElementById('publicIssuesMap');
    if (!mapEl || typeof L === 'undefined') return;

    if (!publicMap) {
      publicMap = L.map('publicIssuesMap', {
        zoomControl: true,
        attributionControl: false,
      }).setView(HYDERABAD_DEFAULT_CENTER, 12);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        minZoom: 10,
      }).addTo(publicMap);

      publicMarkerLayer = L.layerGroup().addTo(publicMap);
    }

    renderPublicMapAndLocalities(cachedIssuesForMap);
  }

  function renderPublicMapAndLocalities(issues) {
    const localityGrid = document.getElementById('publicLocalityGrid');
    const mapPinCountBadge = document.getElementById('mapPinCountBadge');

    if (!issues || issues.length === 0) {
      if (localityGrid) {
        localityGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; color: var(--color-text-muted); padding: 24px; background: white; border-radius: var(--radius-btn); border: 1px dashed var(--color-border);">
            No complaints found matching the selected filters.
          </div>
        `;
      }
      if (publicMarkerLayer) publicMarkerLayer.clearLayers();
      if (mapPinCountBadge) mapPinCountBadge.textContent = '0 Verified Pins';
      return;
    }

    // 1. Group complaints strictly by locality
    const localityMap = {};
    const validCoordIssues = [];

    issues.forEach((issue) => {
      const area = (issue.location_area || 'Other').trim();
      if (!localityMap[area]) {
        localityMap[area] = {
          name: area,
          count: 0,
          categories: {},
          statuses: {},
        };
      }
      localityMap[area].count += 1;
      localityMap[area].categories[issue.category] = (localityMap[area].categories[issue.category] || 0) + 1;
      localityMap[area].statuses[issue.status] = (localityMap[area].statuses[issue.status] || 0) + 1;

      // Only plot real coordinates
      const lat = Number(issue.latitude);
      const lng = Number(issue.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat >= 17.0 && lat <= 17.8 && lng >= 78.0 && lng <= 78.9) {
        validCoordIssues.push(issue);
      }
    });

    // 2. Render real locality summaries
    if (localityGrid) {
      const sortedLocalities = Object.values(localityMap).sort((a, b) => b.count - a.count);
      localityGrid.innerHTML = sortedLocalities
        .map((loc) => {
          const topCategory = Object.entries(loc.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
          const pendingCount = loc.statuses['Pending'] || 0;
          const badgeClass = pendingCount > 0 ? 'badge-high' : 'badge-resolved';

          return `
            <div class="card" style="background-color: var(--color-white); margin-bottom: 0; border-left: 4px solid var(--color-green);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong style="display: flex; align-items: center; gap: 6px;"><i data-lucide="map-pin" class="icon-16"></i> ${escapeHtml(loc.name)}</strong>
                <span class="badge ${badgeClass}">${loc.count} Report${loc.count === 1 ? '' : 's'}</span>
              </div>
              <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 6px; margin-bottom: 8px;">
                Main Category: <strong>${escapeHtml(topCategory)}</strong> (${loc.categories[topCategory]}x)
              </p>
              <a href="/issues?search=${encodeURIComponent(loc.name)}" class="btn btn-secondary btn-sm" style="width: 100%;">View Area Reports</a>
            </div>
          `;
        })
        .join('');

      if (window.initIcons) window.initIcons();
    }

    // 3. Plot verified markers on Leaflet
    if (publicMap && publicMarkerLayer) {
      publicMarkerLayer.clearLayers();

      const colorByPriority = {
        High: '#EF4444',
        Medium: '#F59E0B',
        Low: '#10B981',
        'Needs review': '#6B7280',
      };

      validCoordIssues.forEach((c) => {
        const markerColor = c.status === 'Resolved' ? '#059669' : (colorByPriority[c.priority] || '#167D70');
        const customIcon = L.divIcon({
          className: 'civic-map-marker',
          html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([Number(c.latitude), Number(c.longitude)], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 170px;">
            <div style="font-weight: 700; color: #102B30; margin-bottom: 2px;">${escapeHtml(c.tracking_code)}</div>
            <div style="font-weight: 600; color: #167D70; margin-bottom: 4px;">${escapeHtml(c.category)}</div>
            <div style="font-size: 11px; color: #4B5563; margin-bottom: 6px;">${escapeHtml(c.english_summary || c.location_area)}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #E5E7EB; padding-top: 4px;">
              <span class="badge ${c.status === 'Resolved' ? 'badge-resolved' : 'badge-pending'}" style="font-size: 10px;">${escapeHtml(c.status)}</span>
              <a href="/track?code=${encodeURIComponent(c.tracking_code)}" style="color: #167D70; font-weight: 600; text-decoration: none;">Track ↗</a>
            </div>
          </div>
        `);
        publicMarkerLayer.addLayer(marker);
      });

      if (validCoordIssues.length > 0) {
        const group = L.featureGroup(publicMarkerLayer.getLayers());
        publicMap.fitBounds(group.getBounds().pad(0.15), { maxZoom: 15 });
      } else {
        publicMap.setView(HYDERABAD_DEFAULT_CENTER, 12);
      }
    }

    if (mapPinCountBadge) {
      mapPinCountBadge.textContent = `${validCoordIssues.length} Verified Pin${validCoordIssues.length === 1 ? '' : 's'}`;
    }
  }

  // Toggle between List and Map View
  if (btnViewList && btnViewMap) {
    btnViewList.addEventListener('click', () => {
      btnViewList.className = 'btn btn-green btn-sm';
      btnViewMap.className = 'btn btn-secondary btn-sm';
      listViewContainer.style.display = 'block';
      mapViewContainer.style.display = 'none';
    });

    btnViewMap.addEventListener('click', () => {
      btnViewMap.className = 'btn btn-green btn-sm';
      btnViewList.className = 'btn btn-secondary btn-sm';
      listViewContainer.style.display = 'none';
      mapViewContainer.style.display = 'block';

      setTimeout(() => {
        initPublicMap();
        if (publicMap) publicMap.invalidateSize();
      }, 150);
    });
  }

  const btnCenterMap = document.getElementById('btnCenterPublicMap');
  if (btnCenterMap) {
    btnCenterMap.addEventListener('click', () => {
      if (publicMap) publicMap.setView(HYDERABAD_DEFAULT_CENTER, 12);
    });
  }

  // Pre-fill filter from URL query param if present
  const urlParams = new URLSearchParams(window.location.search);
  const qSearch = urlParams.get('search');
  if (qSearch && filterSearch) {
    filterSearch.value = qSearch;
  }
  const qCat = urlParams.get('category');
  if (qCat && filterCategory) {
    for (let i = 0; i < filterCategory.options.length; i++) {
      if (filterCategory.options[i].value.toLowerCase() === qCat.toLowerCase()) {
        filterCategory.selectedIndex = i;
        break;
      }
    }
  }

  async function loadIssues(page = 1) {
    currentPage = page;
    issuesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-text-muted);">Loading reports from database...</td></tr>`;

    const params = new URLSearchParams({
      page: currentPage,
      limit,
    });

    const category = filterCategory.value;
    if (category && category !== 'All') {
      params.append('category', category);
    }

    const status = filterStatus.value;
    if (status && status !== 'All') {
      params.append('status', status);
    }

    const search = filterSearch.value.trim();
    if (search) {
      params.append('search', search);
    }

    try {
      const res = await fetch(`/api/issues?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        cachedIssuesForMap = json.data.issues || [];
        renderCounts(json.data.counts);
        renderTable(json.data.issues);
        renderPagination(json.data.pagination);
        renderPublicMapAndLocalities(cachedIssuesForMap);
      } else {
        issuesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Failed to load issues.</td></tr>`;
      }
    } catch (err) {
      console.error('Fetch issues error:', err);
      issuesTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #DC2626; padding: 24px;">Network error loading issues.</td></tr>`;
    }
  }

  function renderCounts(counts) {
    if (!counts) return;
    if (countTotal) countTotal.textContent = counts.total ?? 0;
    if (countPending) countPending.textContent = counts.pending ?? 0;
    if (countInProgress) countInProgress.textContent = counts.in_progress ?? 0;
    if (countResolved) countResolved.textContent = counts.resolved ?? 0;
  }

  function renderTable(issues) {
    if (!issues || issues.length === 0) {
      issuesTable.style.display = 'none';
      emptyNotice.style.display = 'block';
      return;
    }

    issuesTable.style.display = 'table';
    emptyNotice.style.display = 'none';

    const catIconNames = {
      'Road Damage': 'construction',
      'Garbage': 'trash-2',
      'Water Leakage': 'droplets',
      'Streetlights': 'lightbulb',
      'Drainage': 'waves',
      'Other': 'clipboard-list',
      'Unclassified': 'help-circle'
    };

    issuesTableBody.innerHTML = issues
      .map((issue) => {
        const statusBadgeClass =
          issue.status === 'Resolved'
            ? 'badge-resolved'
            : issue.status === 'In Progress'
            ? 'badge-inprogress'
            : 'badge-pending';

        const priorityClass =
          issue.priority === 'High'
            ? 'badge-high'
            : issue.priority === 'Medium'
            ? 'badge-medium'
            : 'badge-low';

        const iconName = catIconNames[issue.category] || 'clipboard-list';

        return `
          <tr style="cursor: pointer;" onclick="window.location.href='/track?code=${encodeURIComponent(issue.tracking_code)}'">
            <td data-label="ID">
              <code class="mono" style="font-weight: 700; color: var(--color-green);">${escapeHtml(issue.tracking_code)}</code>
            </td>
            <td data-label="Issue" class="mobile-full-desc">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: var(--color-green); flex-shrink: 0; display: inline-flex; align-items: center;">
                  <i data-lucide="${iconName}" class="icon-16"></i>
                </span>
                <span style="font-weight: 500; color: var(--color-text);">${escapeHtml(issue.english_summary || issue.description || 'Civic report')}</span>
              </div>
            </td>
            <td data-label="Location">
              <span style="display: inline-flex; align-items: center; gap: 4px;">
                <i data-lucide="map-pin" class="icon-16" style="color: var(--color-text-muted);"></i>
                ${escapeHtml(issue.location_area)}
              </span>
            </td>
            <td data-label="Category"><strong>${escapeHtml(issue.category)}</strong></td>
            <td data-label="Priority"><span class="badge ${priorityClass}">${escapeHtml(issue.priority)}</span></td>
            <td data-label="Status"><span class="badge ${statusBadgeClass}">${escapeHtml(issue.status)}</span></td>
            <td data-label="Reported On" style="font-size: 12px; color: var(--color-text-muted); white-space: nowrap;">
              ${formatDate(issue.created_at)}
            </td>
          </tr>
        `;
      })
      .join('');

    if (window.initIcons) {
      window.initIcons();
    }
  }

  function renderPagination(pagination) {
    if (!pagination) return;
    const { page, totalPages, totalCount } = pagination;

    if (pageInfo) pageInfo.textContent = `Page ${page} of ${Math.max(totalPages, 1)} (${totalCount} total)`;
    if (btnPrevPage) btnPrevPage.disabled = page <= 1;
    if (btnNextPage) btnNextPage.disabled = page >= totalPages;
  }

  if (filterCategory) filterCategory.addEventListener('change', () => loadIssues(1));
  if (filterStatus) filterStatus.addEventListener('change', () => loadIssues(1));

  if (filterSearch) {
    filterSearch.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadIssues(1), 350);
    });
  }

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (filterSearch) filterSearch.value = '';
      if (filterCategory) filterCategory.value = 'All';
      if (filterStatus) filterStatus.value = 'All';
      loadIssues(1);
    });
  }

  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (currentPage > 1) loadIssues(currentPage - 1);
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      loadIssues(currentPage + 1);
    });
  }

  loadIssues(1);
});
