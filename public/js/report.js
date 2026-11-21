// CivicFix AI — Report Form Client Logic

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reportForm');
  const descInput = document.getElementById('descInput');
  const areaInput = document.getElementById('areaInput');
  const landmarkInput = document.getElementById('landmarkInput');
  const reporterInput = document.getElementById('reporterInput');
  const photoInput = document.getElementById('photoInput');
  const charCount = document.getElementById('charCount');

  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const photoPreviewImg = document.getElementById('photoPreviewImg');
  const photoPreviewName = document.getElementById('photoPreviewName');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');

  const btnAnalyzeAI = document.getElementById('btnAnalyzeAI');
  const analyzeBtnText = document.getElementById('analyzeBtnText');
  const aiCategory = document.getElementById('aiCategory');
  const aiPriority = document.getElementById('aiPriority');
  const aiDepartment = document.getElementById('aiDepartment');
  const aiReason = document.getElementById('aiReason');
  const aiReasonText = document.getElementById('aiReasonText');
  const aiEnglishSummary = document.getElementById('aiEnglishSummary');

  const btnTriggerSubmit = document.getElementById('btnTriggerSubmit');
  const submitBtnText = document.getElementById('submitBtnText');
  const reportAlert = document.getElementById('reportAlert');

  const reportContentContainer = document.getElementById('reportContentContainer');
  const successCard = document.getElementById('successCard');
  const resultTrackingCode = document.getElementById('resultTrackingCode');
  const btnCopyCode = document.getElementById('btnCopyCode');
  const btnTrackSubmitted = document.getElementById('btnTrackSubmitted');
  const btnReportAnother = document.getElementById('btnReportAnother');

  let aiAnalyzed = false;

  // Pre-fill category from URL query parameters (e.g. ?category=Road+Damage)
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  if (catParam && aiCategory) {
    for (let i = 0; i < aiCategory.options.length; i++) {
      if (aiCategory.options[i].value.toLowerCase() === catParam.toLowerCase()) {
        aiCategory.selectedIndex = i;
        break;
      }
    }
  }

  // Character counter
  if (descInput) {
    descInput.addEventListener('input', () => {
      const len = descInput.value.length;
      if (charCount) charCount.textContent = len;
      if (len > 1500) {
        charCount.style.color = '#DC2626';
      } else {
        charCount.style.color = 'var(--color-text-muted)';
      }
    });
  }

  // Photo preview & validation
  if (photoInput) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) {
        photoPreviewContainer.style.display = 'none';
        return;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showAlert('Only JPG, PNG, and WebP images are supported.', 'error');
        photoInput.value = '';
        photoPreviewContainer.style.display = 'none';
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        showAlert('Photo size exceeds 5 MB limit. Please choose a smaller image.', 'error');
        photoInput.value = '';
        photoPreviewContainer.style.display = 'none';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreviewImg.src = e.target.result;
        photoPreviewName.textContent = file.name;
        photoPreviewContainer.style.display = 'block';
        hideAlert();
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', () => {
      photoInput.value = '';
      photoPreviewContainer.style.display = 'none';
      photoPreviewName.textContent = '';
    });
  }

  // Geolocation detection button
  const btnDetectGps = document.getElementById('btnDetectGps');
  const geoLat = document.getElementById('geoLat');
  const geoLng = document.getElementById('geoLng');

  if (btnDetectGps) {
    btnDetectGps.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      btnDetectGps.textContent = '⏳';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          btnDetectGps.textContent = '✅';
          if (geoLat) geoLat.value = pos.coords.latitude.toFixed(6);
          if (geoLng) geoLng.value = pos.coords.longitude.toFixed(6);
          if (areaInput && (!areaInput.value || areaInput.value.length < 5)) {
            areaInput.value = `Hyderabad (Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)})`;
          }
          setTimeout(() => {
            btnDetectGps.textContent = '🎯';
          }, 3000);
        },
        (err) => {
          btnDetectGps.textContent = '🎯';
          console.warn('Geolocation error:', err.message);
          alert('Could not detect location. Please type your locality name manually.');
        },
        { timeout: 8000 }
      );
    });
  }

  const aiInlineFeedback = document.getElementById('aiInlineFeedback');
  const aiInlineCategory = document.getElementById('aiInlineCategory');
  const aiInlinePriority = document.getElementById('aiInlinePriority');
  const aiInlineReason = document.getElementById('aiInlineReason');

  // Trigger AI Analysis
  if (btnAnalyzeAI) {
    btnAnalyzeAI.addEventListener('click', async () => {
      const desc = descInput ? descInput.value.trim() : '';
      const area = areaInput ? areaInput.value.trim() : '';

      if (desc.length < 15) {
        showAlert('Please enter at least 15 characters describing the issue before analyzing with AI.', 'warning');
        if (descInput) descInput.focus();
        return;
      }

      btnAnalyzeAI.disabled = true;
      if (analyzeBtnText) analyzeBtnText.textContent = 'Analyzing...';
      hideAlert();

      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: desc, location_area: area }),
        });

        const json = await res.json();

        if (res.ok && json.success && json.data) {
          const d = json.data;
          const categoryVal = d.category || 'Unclassified';
          const priorityVal = d.priority || 'Needs review';
          const departmentVal = d.department || 'Roads & Infrastructure';
          const reasonVal = d.reason || 'Categorized by automated analysis.';
          const summaryVal = d.english_summary || desc.slice(0, 150);

          // Update right-hand panel inputs
          if (aiCategory) aiCategory.value = categoryVal;
          if (aiPriority) aiPriority.value = priorityVal;
          if (aiDepartment) aiDepartment.value = departmentVal;
          if (aiReason) aiReason.value = reasonVal;
          if (aiReasonText) aiReasonText.textContent = reasonVal;
          if (aiEnglishSummary) aiEnglishSummary.value = summaryVal;

          // Update inline feedback card immediately visible below the button
          if (aiInlineFeedback) {
            if (aiInlineCategory) aiInlineCategory.textContent = categoryVal;
            if (aiInlinePriority) {
              aiInlinePriority.textContent = priorityVal;
              aiInlinePriority.className = 'badge';
              if (priorityVal === 'High') {
                aiInlinePriority.classList.add('badge-inprogress');
              } else if (priorityVal === 'Medium') {
                aiInlinePriority.classList.add('badge-pending');
              } else {
                aiInlinePriority.classList.add('badge-resolved');
              }
            }
            if (aiInlineReason) aiInlineReason.textContent = reasonVal;
            aiInlineFeedback.style.display = 'block';
          }

          if (analyzeBtnText) analyzeBtnText.textContent = 'Re-analyze with AI';
          aiAnalyzed = true;
        } else {
          const errMsg = (json && json.error) || 'AI analysis could not complete. You can still submit manually.';
          showAlert(`AI Analysis: ${errMsg}`, 'warning');
          fallbackAiValues();
          if (analyzeBtnText) analyzeBtnText.textContent = getTranslation('btnAnalyze') || 'Analyze with AI';
        }
      } catch (err) {
        console.error('AI call error:', err);
        showAlert('Could not reach the AI analysis service. Please check your connection or choose category manually.', 'warning');
        fallbackAiValues();
        if (analyzeBtnText) analyzeBtnText.textContent = getTranslation('btnAnalyze') || 'Analyze with AI';
      } finally {
        btnAnalyzeAI.disabled = false;
      }
    });
  }

  function fallbackAiValues() {
    if (aiCategory) aiCategory.value = 'Unclassified';
    if (aiPriority) aiPriority.value = 'Needs review';
    if (aiDepartment) aiDepartment.value = 'Municipal Services';
    if (aiReason) aiReason.value = 'Automated analysis skipped or unavailable.';
    if (aiReasonText) aiReasonText.textContent = 'Automated analysis unavailable. Marked for human triage.';
    if (aiEnglishSummary) aiEnglishSummary.value = descInput.value.trim().slice(0, 150);
    aiAnalyzed = true;
  }

  // Trigger Submit button in right panel
  if (btnTriggerSubmit) {
    btnTriggerSubmit.addEventListener('click', () => {
      form.requestSubmit();
    });
  }

  // Form Submit Handler
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();

      const desc = descInput.value.trim();
      const area = areaInput.value.trim();

      if (desc.length < 15 || desc.length > 1500) {
        showAlert('Description must be between 15 and 1500 characters.', 'error');
        descInput.focus();
        return;
      }

      if (area.length < 2 || area.length > 100) {
        showAlert('Location / Area must be between 2 and 100 characters.', 'error');
        areaInput.focus();
        return;
      }

      const formData = new FormData();
      formData.append('description', desc);
      formData.append('location_area', area);

      if (landmarkInput.value.trim()) {
        formData.append('landmark', landmarkInput.value.trim());
      }
      if (reporterInput.value.trim()) {
        formData.append('reporter_name', reporterInput.value.trim());
      }

      if (photoInput.files[0]) {
        formData.append('photo', photoInput.files[0]);
      }

      const geoLat = document.getElementById('geoLat');
      const geoLng = document.getElementById('geoLng');
      if (geoLat && geoLat.value) formData.append('latitude', geoLat.value);
      if (geoLng && geoLng.value) formData.append('longitude', geoLng.value);

      formData.append('category', aiCategory ? aiCategory.value : 'Unclassified');
      formData.append('priority', aiPriority ? aiPriority.value : 'Needs review');
      formData.append('suggested_department', aiDepartment ? aiDepartment.value : 'Roads & Infrastructure');
      formData.append('ai_reason', aiReason ? aiReason.value : 'Citizen reported issue.');
      formData.append('english_summary', aiEnglishSummary ? aiEnglishSummary.value : desc.slice(0, 150));

      if (btnTriggerSubmit) btnTriggerSubmit.disabled = true;
      if (submitBtnText) submitBtnText.textContent = getTranslation('submittingText');

      try {
        const res = await fetch('/api/complaints', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();

        if (res.ok && json.success) {
          const trackingCode = json.data.tracking_code;
          resultTrackingCode.textContent = trackingCode;
          btnTrackSubmitted.setAttribute('href', `/track?code=${encodeURIComponent(trackingCode)}`);

          reportContentContainer.style.display = 'none';
          successCard.style.display = 'block';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          showAlert(json.error || 'Failed to submit complaint. Please check your inputs.', 'error');
          if (btnTriggerSubmit) btnTriggerSubmit.disabled = false;
          if (submitBtnText) submitBtnText.textContent = getTranslation('btnSubmit');
        }
      } catch (err) {
        console.error('Submit error:', err);
        showAlert('Network error occurred while submitting complaint. Please try again.', 'error');
        if (btnTriggerSubmit) btnTriggerSubmit.disabled = false;
        if (submitBtnText) submitBtnText.textContent = getTranslation('btnSubmit');
      }
    });
  }

  // Copy tracking code
  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', () => {
      const code = resultTrackingCode.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = btnCopyCode.textContent;
        btnCopyCode.textContent = 'Copied!';
        setTimeout(() => {
          btnCopyCode.textContent = originalText;
        }, 2000);
      });
    });
  }

  // Report another
  if (btnReportAnother) {
    btnReportAnother.addEventListener('click', () => {
      form.reset();
      if (charCount) charCount.textContent = '0';
      if (photoPreviewContainer) photoPreviewContainer.style.display = 'none';
      aiAnalyzed = false;
      if (aiInlineFeedback) aiInlineFeedback.style.display = 'none';
      if (analyzeBtnText) analyzeBtnText.textContent = getTranslation('btnAnalyze') || 'Analyze with AI';
      if (btnTriggerSubmit) btnTriggerSubmit.disabled = false;
      if (submitBtnText) submitBtnText.textContent = getTranslation('btnSubmit');

      successCard.style.display = 'none';
      reportContentContainer.style.display = 'grid';
    });
  }

  function showAlert(msg, type = 'error') {
    reportAlert.className = `alert alert-${type}`;
    reportAlert.textContent = msg;
    reportAlert.style.display = 'block';
    reportAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideAlert() {
    reportAlert.style.display = 'none';
    reportAlert.textContent = '';
  }
});
