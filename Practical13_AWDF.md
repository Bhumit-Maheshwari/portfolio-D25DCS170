# Practical 13: AI API Integration into a Web Application

* **Course:** Advanced Web Development Frameworks (AWDF)
* **CO / PO:** CO6 / PO3, PO5, PO12
* **Objective:** To integrate an external AI service into the existing application and understand responsible AI usage.

---

## 1. Architecture & Data Flow Diagram

```text
React Frontend (Tasks.jsx)
      │
      ├── 1. User types Task Title (e.g., "Implement JWT Authentication")
      ├── 2. Clicks '✨ Auto-Generate with AI (Gemini / OpenAI)'
      │
      ▼
Express Backend (/api/ai/generate-description)
      │
      ├── 3. Read API Key from backend/.env (Server-side ONLY; never exposed to browser)
      │
      ├── 4. Call External AI API (Google Gemini 1.5 Flash / OpenAI GPT-4o-mini)
      │       ├── Timeout protection via AbortController (8000ms)
      │       └── Enforce structured JSON schema response
      │
      ├── 5. Response Evaluation:
      │       ├── Success ──► Parse AI JSON { description, suggestedPriority, checklist }
      │       └── Failure / Missing Key / Timeout ──► Graceful Fallback Engine
      │
      ▼
HTTP 200 JSON Response to React:
{
  "success": true,
  "description": "...",
  "suggestedPriority": "high",
  "checklist": ["Step 1", "Step 2", "Step 3"],
  "model": "Gemini 1.5 Flash" | "Rule-Based Heuristic Fallback"
}
      │
      ▼
React UI Updates (Meaningful Presentation):
      ├── Pre-populates Task Description input field
      ├── Updates Priority dropdown selector to suggested priority
      └── Displays interactive AI Recommendation Card with checklist
```

---

## 2. Responsible AI Principles & Security Measures

1. **Server-Side Secret Storage (Zero Client Exposure):**
   - The `GEMINI_API_KEY` and `OPENAI_API_KEY` are read exclusively by the Express backend using `process.env`.
   - The frontend never receives, stores, or transmits API keys, preventing unauthorized quota consumption or token leakage.
2. **Graceful Degradation (Offline Resilience):**
   - If an external AI provider experiences an outage, network timeout (via `AbortController`), rate limit, or invalid key, the request does **not** fail with an HTTP error.
   - The backend catches the exception and engages an intelligent heuristic fallback engine that derives descriptions and urgency priorities based on keywords, ensuring core task management remains 100% operational.
3. **Structured & Constrained Outputs:**
   - Prompts mandate a strict JSON response schema, eliminating hallucinations and ensuring frontend compatibility.
4. **Meaningful UI Integration:**
   - Rather than dumping raw JSON, suggestions are mapped directly into standard form controls (description textarea, priority dropdown) accompanied by a rich preview card.

---

## 3. Key Source Code Implementations

### A. Backend AI Controller (`backend/controllers/aiController.js`)
Manages calls to Google Gemini / OpenAI APIs with timeout protection and heuristic fallback:

```javascript
/**
 * Practical 13: AI API Integration into a Web Application
 * Controller managing external AI API calls (Google Gemini / OpenAI)
 * with graceful fallback to prevent application disruption.
 */

// Heuristic Fallback Engine
const generateFallbackSuggestion = (title) => {
    const lower = title.toLowerCase();
    let suggestedPriority = 'medium';

    if (/urgent|critical|fix|bug|broken|error|asap|security|auth|jwt|exam|deadline|fail/i.test(lower)) {
        suggestedPriority = 'high';
    } else if (/optional|clean|read|explore|minor|future|consider|tweak/i.test(lower)) {
        suggestedPriority = 'low';
    }

    const description = `Plan and execute all necessary steps to complete "${title}". Ensure implementation details, test coverage, and documentation align with project standards.`;
    const checklist = [
        `Review technical requirements and scope for "${title}"`,
        `Implement core changes and verify edge cases`,
        `Conduct validation tests and update documentation`,
    ];

    return {
        description,
        suggestedPriority,
        checklist,
        source: 'fallback-engine',
        model: 'Rule-Based Heuristic Fallback',
    };
};

// Google Gemini API Integration
const callGeminiAPI = async (title, apiKey) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const promptText = `For the task title: "${title}", generate a concise task description, recommend a priority ("low", "medium", or "high"), and suggest 3 action steps. Output ONLY valid JSON: {"description": "...", "suggestedPriority": "...", "checklist": [...]}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
            }),
            signal: controller.signal,
        });

        const data = await response.json();
        const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
        return {
            description: parsed.description,
            suggestedPriority: parsed.suggestedPriority?.toLowerCase() || 'medium',
            checklist: parsed.checklist || [],
            source: 'gemini-ai',
            model: 'Gemini 1.5 Flash',
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

// POST /api/ai/generate-description
const generateTaskDescription = async (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const cleanTitle = title.trim();
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;

    try {
        let result = null;
        if (geminiKey) {
            try { result = await callGeminiAPI(cleanTitle, geminiKey); } catch (e) {}
        }
        if (!result && openAIKey) {
            try { result = await callOpenAIAPI(cleanTitle, openAIKey); } catch (e) {}
        }
        if (!result) {
            result = generateFallbackSuggestion(cleanTitle);
        }
        return res.status(200).json({ success: true, title: cleanTitle, ...result });
    } catch (err) {
        return res.status(200).json({ success: true, title: cleanTitle, ...generateFallbackSuggestion(cleanTitle) });
    }
};

module.exports = { generateTaskDescription, generateFallbackSuggestion };
```

---

### B. Frontend Integration (`frontend/src/components/Tasks.jsx`)
Provides the AI generation action button, loading state, and suggestion preview card:

```jsx
// AI Assistant Handler
const handleAiGenerate = async () => {
    if (!title.trim()) {
        showToast('Please type a task title first to generate AI suggestions', 'error');
        return;
    }
    setAiLoading(true);
    try {
        const res = await generateAiDescription(title.trim());
        if (res.success) {
            setDescription(res.description);
            if (res.suggestedPriority) setPriority(res.suggestedPriority);
            setAiSuggestion(res);
            showToast(`✨ Generated suggestions via ${res.model || 'AI'}!`, 'success');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setAiLoading(false);
    }
};

// Inside Create Task Form JSX:
<div className="ai-action-bar">
    <button
        type="button"
        className="ai-btn"
        onClick={handleAiGenerate}
        disabled={aiLoading || !title.trim()}
    >
        {aiLoading ? '✨ Analyzing Task with AI...' : '✨ Auto-Generate with AI (Gemini / OpenAI)'}
    </button>
</div>

{aiSuggestion && (
    <div className="ai-suggestion-card">
        <div className="ai-suggestion-top">
            <span className="ai-badge">✨ {aiSuggestion.model}</span>
            <button type="button" className="ai-dismiss-btn" onClick={() => setAiSuggestion(null)}>✕</button>
        </div>
        <p className="ai-desc-preview"><strong>AI Description:</strong> {aiSuggestion.description}</p>
        <span className="ai-priority-tag">Recommended Priority: <strong>{aiSuggestion.suggestedPriority?.toUpperCase()}</strong></span>
        {aiSuggestion.checklist && (
            <ul className="ai-checklist">
                {aiSuggestion.checklist.map((item, idx) => (
                    <li key={idx}>✓ {item}</li>
                ))}
            </ul>
        )}
    </div>
)}
```

---

## 4. Verification & Testing

### Test 1: API Endpoint Verification (cURL / PowerShell)
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/ai/generate-description" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"title": "Implement JWT Authentication for User Login"}'
```

**Response:**
```json
{
  "success": true,
  "title": "Implement JWT Authentication for User Login",
  "description": "Plan and execute all necessary steps to complete \"Implement JWT Authentication for User Login\". Ensure implementation details, test coverage, and documentation align with project standards.",
  "suggestedPriority": "high",
  "checklist": [
    "Review technical requirements and scope for \"Implement JWT Authentication for User Login\"",
    "Implement core changes and verify edge cases",
    "Conduct validation tests and update documentation"
  ],
  "source": "fallback-engine",
  "model": "Rule-Based Heuristic Fallback"
}
```

### Test 2: Automated Unit Test Suite (`npm test`)
Verified that `backend/test/task.test.js` includes automated tests for `generateFallbackSuggestion`:
- Urgent tasks automatically assign `high` priority.
- Informational/optional tasks assign `low` priority.
- Description and 3-step checklist are verified.

---

## 5. Output Screenshots for Submission

1. **AI Generate Button & Form State:** Screenshot of the Task Manager showing the title input and the purple gradient `✨ Auto-Generate with AI` button.
2. **AI Suggestion Card:** Screenshot of the rendered recommendation card displaying the badge, generated description, recommended priority, and action checklist.
3. **Network Tab (Security Verification):** Screenshot of DevTools Network tab confirming that `POST /api/ai/generate-description` is sent to the local backend without exposing any external API secret to the browser.
