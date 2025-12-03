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
  // const isGerman = language === 'german' || language === 'de';
  return `You are a professional sales operations assistant for EMC.

LANGUAGE RULE:
- The input transcript will be in ${language}.
- You MUST write the output ONLY in ${language}.
- You are NOT allowed to translate into any other language.
- If the transcript contains mixed languages, still output strictly in ${language}.

Your task is to convert the provided sales call transcript into a structured EMC sales summary using EXACTLY the format and section titles defined below.

STRICT RULES:
- Follow the structure EXACTLY as written.
- Do NOT add, remove, rename, or reorder any section.
- Do NOT add commentary, analysis, or explanations.
- Do NOT invent or assume any information.
- If information is missing or unclear, write: "Not mentioned".
- Use professional B2B sales language.
- Use concise and factual wording.
- Use bullet points ONLY where explicitly required.


EMC SUMMARY STRUCTURE:
1. Conversation Header (Mandatory)  
Date & time:  
Who spoke with whom? (Name + role at the customer):  
Type of contact: Phone / Email / Visit  
Short sentence (What was it about?):  

2. Short Summary (Sales Summary)  
3–4 bullet points:  
- What did the customer want?  
- How big is the potential?  
- How high is the chance of closing the deal?  

3. Needs & Application  
What does the customer need, for which project – and by when?  

4. Decision Makers & Process  
- Who decides?  
- Who uses it?  
- Who places the order?  
- Where does the customer currently stand? (Interest / Offer / Decision)  

5. Market & Product Knowledge  
- What did I learn about the market?  
- What did I learn about the application of our products?  

6. Deal-Relevant Information  
- Who are the competitors?  
- Decision criteria (Price / Delivery time / Quality / etc.)  
- Timeline (When will the customer decide? When do they need the goods?)  

7. To-Dos & Next Steps  
- My commitments  
- Customer commitments  
- Internal to-dos  
- Next contact (when + for what)  


TRANSCRIPT TO ANALYZE:
${transcript}

FINAL OUTPUT REQUIREMENTS:
- Output ONLY the completed EMC summary.
- No extra text before or after the summary.
- Follow spacing and formatting cleanly.`;

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

