"use server";

interface SummaryGenerationParams {
  transcript: string;
  language: 'german' | 'english';
  apiProvider: 'langdock';
  selectedModel: string;
}

interface ApiResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: any;
  model?: string;
}

function buildSummaryPrompt(transcript: string, language: string): string {
  const isGerman = language === 'german' || language === 'de';

  if (isGerman) {
    return `You are a professional sales operations assistant for EMC.

IMPORTANT CONTEXT ABOUT THE INPUT:
- The input is NOT a verbatim call transcript.
- The input IS a spoken voice note recorded by the sales agent AFTER the call.
- The voice note describes what was discussed with the customer.
- You MUST extract and structure the information based on the agent’s summary.

LANGUAGE OUTPUT RULE:
- The entire output MUST be written ONLY in German.
- Do NOT use any English words under ANY circumstances.

GERMAN SECTION TITLES (MUST BE USED EXACTLY — NO MODIFICATIONS ALLOWED):
1. Gesprächsheader (Pflicht)
- Datum & Uhrzeit:
- Wer hat mit wem gesprochen? (Name + Funktion beim Kunden)
- Art des Kontakts: Telefon / E-Mail / Besuch
- Kurz-Satz (Worum ging’s?):

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
  } else {
    return `You are a professional sales operations assistant for EMC.

IMPORTANT CONTEXT ABOUT THE INPUT:
- The input is NOT a verbatim call transcript.
- The input IS a spoken voice note recorded by the sales agent AFTER the call.
- The voice note describes what was discussed with the customer.
- You MUST extract and structure the information based on the agent’s summary.

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

}

export async function generateSummary(params: SummaryGenerationParams): Promise<ApiResponse> {
  const apiKey = process.env.LANGDOCK_API_KEY || '';

  if (!apiKey) {
    return {
      success: false,
      error: 'LangDock API key not found. Please configure the API key in the .env file.'
    };
  }

  const prompt = buildSummaryPrompt(params.transcript, params.language);

  const requestBody = {
    model: params.selectedModel,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_completion_tokens: 3000
  };

  try {
    const region = 'eu';
    const modelLower = (params.selectedModel || '').toLowerCase();
    let apiUrl = '';
    let finalBody: any = requestBody;

    if (modelLower.startsWith('claude')) {
      // Anthropic via LangDock
      apiUrl = `https://api.langdock.com/anthropic/${region}/v1/messages`;
      finalBody = {
        model: params.selectedModel,
        max_tokens: 3000,
        temperature: 0.7,
        messages: [
          { role: 'user', content: prompt }
        ]
      };
    } else {
      // OpenAI-compatible via LangDock
      apiUrl = `https://api.langdock.com/openai/${region}/v1/chat/completions`;
      finalBody = requestBody;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(finalBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `API Error: ${errorData.error?.message || response.statusText}`
      };
    }

    const data = await response.json();

    // Extract content from different provider schemas
    let content: string | undefined;
    let usage: any;
    let model: string | undefined;

    if (Array.isArray(data)) {
      content = data[0]?.content?.[0]?.text || data[0]?.text;
      usage = data[0]?.usage;
      model = data[0]?.model;
    } else if (data.content) {
      // Anthropic format
      if (Array.isArray(data.content)) {
        content = data.content[0]?.text;
      } else if (typeof data.content === 'string') {
        content = data.content;
      }
      usage = data.usage;
      model = data.model;
    } else if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      // OpenAI format
      content = data.choices[0]?.message?.content;
      usage = data.usage;
      model = data.model;
    }

    if (!content) {
      return {
        success: false,
        error: 'No content received from API'
      };
    }

    return {
      success: true,
      content: content.trim(),
      usage,
      model
    };
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Summary generation failed'
    };
  }
}

