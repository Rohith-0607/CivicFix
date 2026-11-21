// CivicFix AI — Complaint Tracking Logic

document.addEventListener('DOMContentLoaded', () => {
  const trackForm = document.getElementById('trackForm');
  const trackCodeInput = document.getElementById('trackCodeInput');
  const btnLookup = document.getElementById('btnLookup');
  const trackAlert = document.getElementById('trackAlert');

  const trackResultCard = document.getElementById('trackResultCard');
  const resultCode = document.getElementById('resultCode');
  const resultStatusBadge = document.getElementById('resultStatusBadge');
  const resultCategory = document.getElementById('resultCategory');
  const resultArea = document.getElementById('resultArea');
  const resultCreated = document.getElementById('resultCreated');
  const resultUpdated = document.getElementById('resultUpdated');
  const resultPriority = document.getElementById('resultPriority');
  const resultDepartment = document.getElementById('resultDepartment');

  // Check URL query param ?code=...
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get('code');
  if (codeParam) {
    trackCodeInput.value = codeParam.trim().toUpperCase();
    performLookup(codeParam.trim());
  }

  trackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = trackCodeInput.value.trim().toUpperCase();
    if (!code) return;
    performLookup(code);
  });

  async function performLookup(code) {
    hideAlert();
    trackResultCard.style.display = 'none';
    btnLookup.disabled = true;
    btnLookup.textContent = 'Searching...';

    try {
      // 1. Try path route first (/api/track/:code)
      let res = await fetch(`/api/track/${encodeURIComponent(code)}`);

      // 2. If edge router returned 404 text or unsupported subpath, try query endpoint (/api/track?code=...)
      if (!res.ok && res.status === 404) {
        const queryRes = await fetch(`/api/track?code=${encodeURIComponent(code)}`);
        if (queryRes.ok) {
          res = queryRes;
        }
      }

      // 3. Safe JSON parsing (handles plain-text edge 404 gracefully without throwing SyntaxError)
      let json = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
      }

      if (res.ok && json && json.success && json.data) {
        const d = json.data;
        resultCode.textContent = d.tracking_code;
        resultCategory.textContent = d.category || 'Unclassified';
        resultArea.textContent = d.location_area || '—';
        resultCreated.textContent = formatDate(d.created_at);
        resultUpdated.textContent = formatDate(d.updated_at);
        resultPriority.textContent = d.priority || 'Needs review';
        resultDepartment.textContent = d.suggested_department || 'Municipal Services';

        // Status badge styling
        const status = d.status || 'Pending';
        resultStatusBadge.textContent = status;
        resultStatusBadge.className = 'badge';

        if (status === 'Resolved') {
          resultStatusBadge.classList.add('badge-resolved');
        } else if (status === 'In Progress') {
          resultStatusBadge.classList.add('badge-inprogress');
        } else {
          resultStatusBadge.classList.add('badge-pending');
        }

        trackResultCard.style.display = 'block';

        // Update URL query param without full page reload
        const newUrl = `${window.location.pathname}?code=${encodeURIComponent(code)}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      } else {
        const errorMsg = (json && json.error) || getTranslation('errNotFound') || `Complaint ${code} not found.`;
        showAlert(errorMsg, 'error');
      }
    } catch (err) {
      console.error('Tracking lookup error:', err);
      showAlert('Unable to reach server. Please check your network connection.', 'error');
    } finally {
      btnLookup.disabled = false;
      btnLookup.textContent = getTranslation('btnLookup');
    }
  }

  function showAlert(msg, type = 'error') {
    trackAlert.className = `alert alert-${type}`;
    trackAlert.textContent = msg;
    trackAlert.style.display = 'block';
  }

  function hideAlert() {
    trackAlert.style.display = 'none';
    trackAlert.textContent = '';
  }
});
