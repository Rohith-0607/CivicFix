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
        renderCounts(json.data.counts);
        renderTable(json.data.issues);
        renderPagination(json.data.pagination);
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
