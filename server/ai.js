// CivicFix AI — AI Classification Engine (Gemini)
// Server-side only; validates all model outputs against strictly defined enums.

const ALLOWED_CATEGORIES = [
  'Road Damage',
  'Garbage',
  'Water Leakage',
  'Streetlights',
  'Drainage',
  'Other',
  'Unclassified',
];

const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High', 'Needs review'];

const ALLOWED_DEPARTMENTS = [
  'Road Maintenance',
  'Sanitation',
  'Water Supply',
  'Street Lighting',
  'Drainage',
  'Municipal Services',
];

const DEFAULT_FALLBACK = {
  category: 'Unclassified',
  priority: 'Needs review',
  department: 'Municipal Services',
  reason: 'Automated AI analysis unavailable or unclassified; routed for manual review.',
  english_summary: '',
};

/**
 * Heuristic fallback classifier when Gemini API is unavailable or disabled
 */
function heuristicFallback(description, locationArea) {
  const text = (description + ' ' + (locationArea || '')).toLowerCase();

  let category = 'Unclassified';
  let priority = 'Needs review';
  let department = 'Municipal Services';
  let reason = 'Preliminary local keyword identification. Needs human administrator review.';

  // Telugu, Hindi & English keywords
  if (
    text.includes('pothole') ||
    text.includes('road') ||
    text.includes('గుంత') ||
    text.includes('రోడ్డు') ||
    text.includes('गड्ढा') ||
    text.includes('सड़क') ||
    text.includes('tar') ||
    text.includes('divider')
  ) {
    category = 'Road Damage';
    priority = 'Medium';
    department = 'Road Maintenance';
    reason = 'The description mentions road surface or pothole issues.';
  } else if (
    text.includes('garbage') ||
    text.includes('waste') ||
    text.includes('trash') ||
    text.includes('చెత్త') ||
    text.includes('कचरा') ||
    text.includes('गंदगी') ||
    text.includes('dump') ||
    text.includes('cleaning')
  ) {
    category = 'Garbage';
    priority = 'Medium';
    department = 'Sanitation';
    reason = 'The description points to uncollected waste or sanitary dumping.';
  } else if (
    text.includes('water') ||
    text.includes('leak') ||
    text.includes('నీరు') ||
    text.includes('పైపు') ||
    text.includes('पानी') ||
    text.includes('रिसाव') ||
    text.includes('नल') ||
    text.includes('pipe')
  ) {
    category = 'Water Leakage';
    priority = 'Medium';
    department = 'Water Supply';
    reason = 'The description mentions water pipeline leakage or supply issues.';
  } else if (
    text.includes('light') ||
    text.includes('dark') ||
    text.includes('దీపం') ||
    text.includes('లైట్') ||
    text.includes('बत्ती') ||
    text.includes('रोशनी') ||
    text.includes('बिजली') ||
    text.includes('lamp')
  ) {
    category = 'Streetlights';
    priority = 'Low';
    department = 'Street Lighting';
    reason = 'The issue relates to public street illumination.';
  } else if (
    text.includes('drain') ||
    text.includes('sewage') ||
    text.includes('కాలువ') ||
    text.includes('नाली') ||
    text.includes('सीवर') ||
    text.includes('overflow') ||
    text.includes('manhole')
  ) {
    category = 'Drainage';
    priority = 'High';
    department = 'Drainage';
    reason = 'Drainage and sewage blockage may present health and flooding risks.';
  }

  // Create an approximate English summary
  let englishSummary = description.trim();
  if (englishSummary.length > 150) {
    englishSummary = englishSummary.slice(0, 147) + '...';
  }

  return {
    category,
    priority,
    department,
    reason,
    english_summary: englishSummary,
  };
}

/**
 * Validate and clean the AI response object against strict schema
 */
function sanitizeAiOutput(raw, originalDescription) {
  if (!raw || typeof raw !== 'object') {
    return heuristicFallback(originalDescription);
  }

  const category = ALLOWED_CATEGORIES.includes(raw.category) ? raw.category : 'Unclassified';
  const priority = ALLOWED_PRIORITIES.includes(raw.priority) ? raw.priority : 'Needs review';
  const department = typeof raw.department === 'string' && ALLOWED_DEPARTMENTS.includes(raw.department.trim())
    ? raw.department.trim()
    : 'Municipal Services';

  const reason = typeof raw.reason === 'string' && raw.reason.trim()
    ? raw.reason.trim()
    : 'Identified by AI assistant based on reported description.';

  const english_summary = typeof raw.english_summary === 'string' && raw.english_summary.trim()
    ? raw.english_summary.trim()
    : originalDescription.slice(0, 150);

  return {
    category,
    priority,
    department,
    reason,
    english_summary,
  };
}

/**
 * Call Gemini API with structured JSON output instructions
 */
async function analyzeComplaint(description, locationArea) {
  if (!description || description.trim().length < 10) {
    throw new Error('Description too short for meaningful analysis');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(
    apiKey &&
    !apiKey.includes('your_gemini') &&
    apiKey !== 'placeholder'
  );

  if (!isKeyConfigured) {
    console.warn('[AI] GEMINI_API_KEY not configured. Using local heuristic fallback.');
    return heuristicFallback(description, locationArea);
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const systemPrompt = `You are CivicFix AI, an automated civic complaint categorization engine for Indian cities.
You analyze civic complaints reported by citizens in English or Telugu.
Analyze the user's reported problem and return ONLY a valid JSON object with the following fields:
- "category": must be EXACTLY ONE of: "Road Damage", "Garbage", "Water Leakage", "Streetlights", "Drainage", "Other", "Unclassified".
- "priority": must be EXACTLY ONE of: "Low", "Medium", "High".
- "department": suggested municipal department, one of: "Road Maintenance", "Sanitation", "Water Supply", "Street Lighting", "Drainage", "Municipal Services".
- "reason": 1 to 2 factual sentences explaining why this category and priority were chosen based ONLY on signals in the text. Do not hallucinate accidents, injuries, or hazards not stated in the report.
- "english_summary": a concise 1-sentence English translation/summary of the issue, even if the user reported in Telugu. Preserve uncertainty and do not add claims.

Return pure JSON without markdown code fences.`;

  const userContent = `Reported Area: ${locationArea || 'Not specified'}\nComplaint Description: ${description}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userContent },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[AI] Gemini API returned error ${response.status}:`, errText);
      return heuristicFallback(description, locationArea);
    }

    const json = await response.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.warn('[AI] Empty response from Gemini API');
      return heuristicFallback(description, locationArea);
    }

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      // In case wrapped in markdown code fence
      const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return sanitizeAiOutput(parsed, description);
  } catch (err) {
    console.error('[AI] Gemini API call failed:', err.message);
    return heuristicFallback(description, locationArea);
  }
}

module.exports = {
  analyzeComplaint,
  sanitizeAiOutput,
  heuristicFallback,
  ALLOWED_CATEGORIES,
  ALLOWED_PRIORITIES,
  ALLOWED_DEPARTMENTS,
};
