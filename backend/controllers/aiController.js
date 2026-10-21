/**
 * Practical 13: AI API Integration into a Web Application
 * Controller managing external AI API calls (Google Gemini / OpenAI)
 * with graceful fallback to prevent application disruption.
 */

/**
 * Intelligent local fallback generator
 * Activated if no API key is configured or if the external AI service fails/times out.
 * Ensures the application remains 100% operational (Graceful Degradation).
 */
const generateFallbackSuggestion = (title) => {
    const lower = title.toLowerCase();
    let suggestedPriority = 'medium';

    // Heuristic priority detection based on task urgency keywords
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
        note: 'Generated using local fallback engine. To enable live AI, add GEMINI_API_KEY or OPENAI_API_KEY in backend/.env',
    };
};

/**
 * Call Google Gemini API
 */
const callGeminiAPI = async (title, apiKey) => {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const promptText = `You are a software productivity assistant. For the task title: "${title}", generate a concise task description, recommend a priority, and suggest 3 action steps.
Respond ONLY with a valid JSON object in this format:
{
  "description": "Clear 2-sentence description of what needs to be done.",
  "suggestedPriority": "low" or "medium" or "high",
  "checklist": ["step 1", "step 2", "step 3"]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: 'application/json',
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `Gemini API responded with status ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawContent) {
            throw new Error('No content returned by Gemini API');
        }

        const parsed = JSON.parse(rawContent);
        return {
            description: parsed.description || `Execute task: ${title}`,
            suggestedPriority: ['low', 'medium', 'high'].includes(parsed.suggestedPriority?.toLowerCase())
                ? parsed.suggestedPriority.toLowerCase()
                : 'medium',
            checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
            source: 'gemini-ai',
            model: 'Gemini 1.5 Flash',
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * Call OpenAI API
 */
const callOpenAIAPI = async (title, apiKey) => {
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const promptText = `For the task title: "${title}", generate a concise task description, recommend a priority ("low", "medium", or "high"), and suggest 3 action steps.
Return ONLY valid JSON matching this schema:
{
  "description": "string",
  "suggestedPriority": "low" | "medium" | "high",
  "checklist": ["string", "string", "string"]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a task management AI assistant. Always output JSON.' },
                    { role: 'user', content: promptText },
                ],
                response_format: { type: 'json_object' },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `OpenAI API returned status ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);

        return {
            description: parsed.description,
            suggestedPriority: ['low', 'medium', 'high'].includes(parsed.suggestedPriority?.toLowerCase())
                ? parsed.suggestedPriority.toLowerCase()
                : 'medium',
            checklist: parsed.checklist || [],
            source: 'openai-ai',
            model: 'GPT-4o-mini',
        };
    } finally {
        clearTimeout(timeoutId);
    }
};

/**
 * POST /api/ai/generate-description (or /ai/generate-description)
 * Generates AI-assisted task descriptions and priority recommendations
 */
const generateTaskDescription = async (req, res) => {
    const { title } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Task title is required to generate AI suggestions',
        });
    }

    const cleanTitle = title.trim();
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAIKey = process.env.OPENAI_API_KEY;

    try {
        let result = null;

        // Try Gemini API first if key is present
        if (geminiKey && geminiKey.trim()) {
            try {
                result = await callGeminiAPI(cleanTitle, geminiKey.trim());
            } catch (geminiError) {
                console.warn(`[AI Warning] Gemini API call failed: ${geminiError.message}. Attempting secondary or fallback.`);
            }
        }

        // Try OpenAI API if Gemini wasn't configured or failed
        if (!result && openAIKey && openAIKey.trim()) {
            try {
                result = await callOpenAIAPI(cleanTitle, openAIKey.trim());
            } catch (openaiError) {
                console.warn(`[AI Warning] OpenAI API call failed: ${openaiError.message}. Falling back.`);
            }
        }

        // Graceful Fallback if neither API succeeded or no keys are configured
        if (!result) {
            result = generateFallbackSuggestion(cleanTitle);
        }

        return res.status(200).json({
            success: true,
            title: cleanTitle,
            ...result,
        });
    } catch (err) {
        // Absolute fallback to ensure core web application NEVER crashes
        console.error('[AI Error] Unexpected error in AI controller:', err);
        const fallback = generateFallbackSuggestion(cleanTitle);
        return res.status(200).json({
            success: true,
            title: cleanTitle,
            ...fallback,
        });
    }
};

module.exports = {
    generateTaskDescription,
    generateFallbackSuggestion,
};
