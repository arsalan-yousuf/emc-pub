"use server";

// ============================================================================
// Type Definitions
// ============================================================================

export interface SummaryGenerationParams {
  transcript: string;
  language: 'german' | 'english';
  customer_name: string;
  interlocutor: string;
  apiProvider: 'langdock';
  selectedModel: string;
}

export interface ApiResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: unknown;
  model?: string;
}

interface ApiRequestConfig {
  url: string;
  body: Record<string, unknown>;
}

interface ParsedApiResponse {
  content?: string;
  usage?: unknown;
  model?: string;
}

// ============================================================================
// Constants
// ============================================================================

const LANGDOCK_API_BASE = 'https://api.langdock.com';
const LANGDOCK_REGION = 'eu';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 3000;
const CLAUDE_MODEL_PREFIX = 'claude';

const ERROR_MESSAGES = {
  MISSING_API_KEY: 'LangDock API key not found. Please configure the API key in the .env.',
  NO_CONTENT: 'No content received from API',
  GENERATION_FAILED: 'Summary generation failed',
} as const;

// ============================================================================
// Prompt Templates
// ============================================================================

/**
 * Builds the German prompt template
 */
function buildGermanPrompt(transcript: string, customer_name: string, interlocutor: string): string {
  return `You are a professional sales operations assistant for EMC.

IMPORTANT CONTEXT ABOUT THE INPUT:
- The input is NOT a verbatim call transcript.
- The input IS a spoken voice note recorded by the sales agent AFTER the call.
- The voice note describes what was discussed with the customer.
- You MUST extract and structure the information based on the agent's summary.

CURRENT DATE & TIME CONTEXT:
- Today’s date and time (reference for all relative dates): ${new Date().toISOString()}
- Assume this datetime as the absolute reference point when resolving expressions like
  “heute”, “morgen”, “nächste Woche”, “nächsten Mittwoch”, “in zwei Tagen”, etc.

TEMPORAL NORMALIZATION RULES (MANDATORY):
- Any relative date or time mentioned in the voice note MUST be converted into an exact date.
- Examples:
  - “morgen” → exact date based on today’s date
  - “nächsten Mittwoch” → next calendar Wednesday after today
  - “in zwei Wochen” → exact date
  - “morgen um 17 Uhr” → exact date + time
- If a date is mentioned without a time, omit the time.
- If a time is mentioned without a date, infer the nearest reasonable future date.
- If neither date nor time can be reasonably inferred, write exactly: "Nicht erwähnt".
- Do NOT keep relative expressions in the final output.

DATE & TIME OUTPUT FORMAT RULE (MANDATORY):
- When writing dates and times in the final summary, use the following format ONLY:
  YYYY-MM-DD HH:mm
- Do NOT include milliseconds.
- Do NOT include "T".
- Do NOT include timezone indicators such as "Z".
- Example:
  Correct: 2025-12-22 10:55
  Incorrect: 2025-12-22T10:55:36.461Z

ADDITIONAL STRUCTURED INPUTS:
- Client / Customer name: ${customer_name}
- Interlocutor (person spoken to at customer): ${interlocutor}

USAGE RULE FOR STRUCTURED INPUTS:
- If these inputs are provided, you MUST use them to populate the relevant fields.
- If they are empty or missing, extract the information from the voice note.
- If neither source provides the information, write exactly: "Nicht erwähnt".

LANGUAGE OUTPUT RULE:
- The entire output MUST be written ONLY in German.
- Do NOT use any English words under ANY circumstances.

GERMAN SECTION TITLES (MUST BE USED EXACTLY — NO MODIFICATIONS ALLOWED):
1. Gesprächsheader (Pflicht)
- Datum & Uhrzeit:
- Wer hat mit wem gesprochen? (Name + Funktion beim Kunden)
- Art des Kontakts: Telefon / E-Mail / Besuch
- Kurz-Satz (Worum ging's?):

2. Kurze Zusammenfassung (Sales Summary)
3–4 Bullet Points:
- Was wollte der Kunde?
- Wie groß ist das Potenzial?
- Wie hoch die Abschlusschance?

3. Bedarf & Anwendung
- Was braucht der Kunde für welches Projekt – und bis wann?

4. Entscheider & Ablauf
- Wer entscheidet?
- Wer nutzt es?
- Wer bestellt?
- Wo steht der Kunde gerade? (Interesse / Angebot / Entscheidung)

5. Markt- & Produktwissen
- Was habe ich Neues über den Markt gelernt?
- Was habe ich Neues über die Anwendung unserer Produkte gelernt?

6. Abschlussrelevante Infos
- Wer sind die Wettbewerber?
- Entscheidungskriterien (Preis / Lieferzeit / Qualität / etc.)
- Timeline (Wann entscheidet der Kunde, wann braucht er Ware?)

7. To-Dos & Nächster Schritt
- Meine Zusagen
- Kunden-Zusagen
- Interne To-Dos
- Nächster Kontakt (wann + wofür)

STRICT STRUCTURE ENFORCEMENT:
- You MUST use the structure above EXACTLY as shown.
- You MUST NOT modify, rename, reorder, shorten, or expand ANY line.
- You MUST ONLY fill in content AFTER the colons.
- You MUST NEVER replace a heading or bullet with an answer.
- If any information is missing, you MUST write exactly: "Nicht erwähnt".
- You MUST preserve all punctuation, formatting, and bullet points exactly.

SPRACHNOTIZ ZUR ANALYSE:
${transcript}

FINAL OUTPUT RULES:
- Output ONLY the completed EMC summary.
- NO explanations.
- NO comments.
- NO extra text.
- NO repetition of these rules.
- NO structure changes.`;
}

/**
 * Builds the English prompt template
 */
function buildEnglishPrompt(transcript: string, customer_name: string, interlocutor: string): string {
  return `You are a professional sales operations assistant for E-M-C direct GmbH & Co. KG.

IMPORTANT CONTEXT ABOUT THE INPUT:
- The input is NOT a verbatim call transcript.
- The input IS a spoken voice note recorded by the sales agent AFTER the call.
- The voice note describes what was discussed with the customer.
- You MUST extract and structure the information based on the agent's summary.

CURRENT DATE & TIME CONTEXT:
- Today’s date and time (reference for all relative dates): ${new Date().toISOString()}
- Assume this datetime as the absolute reference point when resolving expressions like
  “today”, “tomorrow”, “next week”, “next Wednesday”, “in two days”, etc.

TEMPORAL NORMALIZATION RULES (MANDATORY):
- Any relative date or time mentioned in the voice note MUST be converted into an exact date.
- Examples:
  - “Tomorrow” → calculate exact date based on today’s date
  - “Next Wednesday” → calculate the next calendar Wednesday after today
  - “In two weeks” → calculate the exact date
  - “Tomorrow at 5pm” → calculate exact date + time
- If a date is mentioned without a time, omit the time.
- If a time is mentioned without a date, infer the nearest reasonable future date.
- If neither date nor time can be reasonably inferred, write: "Not mentioned".
- Do NOT keep relative expressions in the final output.

DATE & TIME OUTPUT FORMAT RULE (MANDATORY):
- When writing dates and times in the final summary, use the following format ONLY:
  YYYY-MM-DD HH:mm
- Do NOT include milliseconds.
- Do NOT include "T".
- Do NOT include timezone indicators such as "Z".
- Example:
  Correct: 2025-12-22 10:55
  Incorrect: 2025-12-22T10:55:36.461Z

ADDITIONAL STRUCTURED INPUTS:
- Client / Customer name: ${customer_name}
- Interlocutor (person spoken to at customer): ${interlocutor}

USAGE RULE FOR STRUCTURED INPUTS:
- If these inputs are provided, you MUST use them to populate the relevant fields.
- If they are empty or missing, extract the information from the voice note.
- If neither source provides the information, write exactly: "Not mentioned".

LANGUAGE OUTPUT RULE:
- The entire output MUST be written ONLY in English.
- Do NOT use any German words under ANY circumstances.

STRICT STRUCTURE ENFORCEMENT:
- You MUST use the structure below EXACTLY as shown.
- You MUST NOT modify, rename, reorder, shorten, or expand ANY section title or bullet.
- You MUST ONLY fill in content AFTER the colons.
- You MUST NEVER replace a heading or bullet with an answer.
- If any information is missing, you MUST write exactly: "Not mentioned".
- You MUST preserve all punctuation, formatting, and bullet points exactly.

STRUCTURE (DO NOT MODIFY ANY LINE BELOW):

1. Conversation Header (Mandatory)
- Date & time:
- Who spoke with whom? (Name + function at the customer)
- Type of contact: Telephone / E-mail / Visit
- Short sentence (What was it about?):

2. Short Summary (Sales Summary)
3–4 bullet points:
- What did the customer want?
- How big is the potential?
- How high is the chance of closing?

3. Needs & Application
- What does the customer need for which project – and by when?

4. Decision Makers & Process
- Who decides?
- Who uses it?
- Who orders?
- Where does the customer currently stand? (Interest / Offer / Decision)

5. Market & Product Knowledge
- What have I learned that is new about the market?
- What have I learned that is new about the application of our products?

6. Deal-Relevant Information
- Who are the competitors?
- Decision criteria (Price / Delivery time / Quality / etc.)
- Timeline (When will the customer decide, when do they need goods?)

7. To-Dos & Next Step
- My commitments
- Customer commitments
- Internal to-dos
- Next contact (when + for what)

VOICE NOTE TO ANALYZE:
${transcript}

FINAL OUTPUT RULES:
- Output ONLY the completed EMC summary.
- Do NOT add explanations.
- Do NOT add comments.
- Do NOT add extra text.
- Do NOT repeat these rules.
- Do NOT change the structure.`;
}

/**
 * Builds the summary prompt based on language
 */
function buildSummaryPrompt(
  transcript: string,
  language: string,
  customer_name: string,
  interlocutor: string
): string {
  const isGerman = language === 'german' || language === 'de';
  return isGerman
    ? buildGermanPrompt(transcript, customer_name, interlocutor)
    : buildEnglishPrompt(transcript, customer_name, interlocutor);
}

// ============================================================================
// API Configuration
// ============================================================================

/**
 * Determines if a model is Anthropic Claude
 */
function isClaudeModel(model: string): boolean {
  return model.toLowerCase().startsWith(CLAUDE_MODEL_PREFIX);
}

/**
 * Builds API request configuration based on model type
 */
function buildApiConfig(
  model: string,
  prompt: string
): ApiRequestConfig {
  const isClaude = isClaudeModel(model);

  if (isClaude) {
    return {
      url: `${LANGDOCK_API_BASE}/anthropic/${LANGDOCK_REGION}/v1/messages`,
      body: {
        model,
        max_tokens: DEFAULT_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
        messages: [{ role: 'user', content: prompt }],
      },
    };
  }

  return {
    url: `${LANGDOCK_API_BASE}/openai/${LANGDOCK_REGION}/v1/chat/completions`,
    body: {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: DEFAULT_TEMPERATURE,
      max_completion_tokens: DEFAULT_MAX_TOKENS,
    },
  };
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parses API response from different provider formats
 */
function parseApiResponse(data: unknown): ParsedApiResponse {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const response = data as Record<string, unknown>;

  // Handle array response format
  if (Array.isArray(response) && response.length > 0) {
    const firstItem = response[0] as Record<string, unknown>;
    return {
      content: extractContent(firstItem),
      usage: firstItem.usage,
      model: firstItem.model as string | undefined,
    };
  }

  // Handle Anthropic format
  if ('content' in response) {
    return {
      content: extractContent(response),
      usage: response.usage,
      model: response.model as string | undefined,
    };
  }

  // Handle OpenAI format
  if ('choices' in response && Array.isArray(response.choices) && response.choices.length > 0) {
    const choice = response.choices[0] as Record<string, unknown>;
    const message = choice.message as Record<string, unknown>;
    return {
      content: message.content as string | undefined,
      usage: response.usage,
      model: response.model as string | undefined,
    };
  }

  return {};
}

/**
 * Extracts content from various response formats
 */
function extractContent(item: Record<string, unknown>): string | undefined {
  // Handle content array (Anthropic format)
  if (Array.isArray(item.content)) {
    const firstContent = item.content[0] as Record<string, unknown>;
    return firstContent.text as string | undefined;
  }

  // Handle content string
  if (typeof item.content === 'string') {
    return item.content;
  }

  // Handle direct text property
  if (typeof item.text === 'string') {
    return item.text;
  }

  return undefined;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Handles API error responses
 */
async function handleApiError(response: Response): Promise<ApiResponse> {
  try {
    const errorData = (await response.json()) as Record<string, unknown>;
    const errorMessage =
      (errorData.error as Record<string, unknown>)?.message ||
      response.statusText ||
      'Unknown API error';
    return {
      success: false,
      error: `API Error: ${errorMessage}`,
    };
  } catch {
    return {
      success: false,
      error: `API Error: ${response.statusText || 'Unknown error'}`,
    };
  }
}

/**
 * Handles general errors
 */
function handleError(error: unknown): ApiResponse {
  console.error('Summary generation error:', error);
  const errorMessage =
    error instanceof Error ? error.message : ERROR_MESSAGES.GENERATION_FAILED;
  return {
    success: false,
    error: errorMessage,
  };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates a sales summary from a transcript using LangDock API
 * @param params - Summary generation parameters
 * @returns API response with generated summary or error
 */
export async function generateSummary(params: SummaryGenerationParams): Promise<ApiResponse> {
  const apiKey = process.env.LANGDOCK_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: ERROR_MESSAGES.MISSING_API_KEY,
    };
  }

  try {
    const prompt = buildSummaryPrompt(
      params.transcript,
      params.language,
      params.customer_name,
      params.interlocutor
    );

    const { url, body } = buildApiConfig(params.selectedModel, prompt);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return await handleApiError(response);
    }

    const data = (await response.json()) as unknown;
    const parsed = parseApiResponse(data);

    if (!parsed.content) {
      return {
        success: false,
        error: ERROR_MESSAGES.NO_CONTENT,
      };
    }

    return {
      success: true,
      content: parsed.content.trim(),
      usage: parsed.usage,
      model: parsed.model,
    };
  } catch (error) {
    return handleError(error);
  }
}
