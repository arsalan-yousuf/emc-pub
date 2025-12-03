'use client';

import { useState, useEffect } from 'react';
import { generateEmail, translateText, improveEmail } from '@/lib/email-generator';
import VoiceInput from './VoiceInput';
import {
  Edit3,
  Copy,
  Save,
  Wrench,
  Mail,
  DollarSign,
  AlertTriangle,
  Calendar,
  HelpCircle,
  FileText,
  Smile,
  ArrowDownToDot,
  BadgeEuro,
  ScrollText,
  ArrowDownWideNarrow,
  Target,
  Shield
} from 'lucide-react';

interface GeneratorTabProps {
  isSimpleMode?: boolean;
  refreshTrigger?: number;
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
}

export default function GeneratorTab({ isSimpleMode = true, refreshTrigger = 0, showToast }: GeneratorTabProps) {
  const [emailInput, setEmailInput] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('german');
  const [selectedOccasion, setSelectedOccasion] = useState('');
  const [selectedTone, setSelectedTone] = useState('');
  const [selectedResponseType, setSelectedResponseType] = useState<'antwort' | 'neu'>('antwort');
  const [emailPlaceholder, setEmailPlaceholder] = useState('Fügen Sie hier die E-Mail ein, auf die Sie antworten möchten...');
  const [customInstructionsPlaceholder, setCustomInstructionsPlaceholder] = useState('Zusätzliche Anweisungen für die E-Mail-Generierung (optional)...');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [showInputTranslation, setShowInputTranslation] = useState(false);
  const [inputTranslation, setInputTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectionTimeout, setDetectionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [outputTranslation, setOutputTranslation] = useState('');
  const [showOutputTranslation, setShowOutputTranslation] = useState(false);
  const [customTone, setCustomTone] = useState('');
  const [currentRating, setCurrentRating] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [openAiModel, setOpenAiModel] = useState('gpt-4.1');
  const [langDockModel, setLangDockModel] = useState('gpt-4.1');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [parsedData, setParsedData] = useState<{ subject: string, email: string, timestamp?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isImproveMode, setIsImproveMode] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(true);
  const [apiProvider, setApiProvider] = useState<'openai' | 'langdock'>('langdock');
  const [templates, setTemplates] = useState<any[]>([]);
  // const [selectedEmailLength, setSelectedEmailLength] = useState('');
  const [isAnyRecording, setIsAnyRecording] = useState(false);
  // const [generationUsage, setGenerationUsage] = useState<any>(null);
  // const [generationModel, setGenerationModel] = useState<string | null>(null);
  // const [translationUsage, setTranslationUsage] = useState<any>(null);
  // const [translationModel, setTranslationModel] = useState<string | null>(null);

  // Check if API is configured and load settings
  useEffect(() => {
    const savedApiProvider = (localStorage.getItem('apiProvider') as 'openai' | 'langdock') || 'langdock';
    const savedOpenAiModel = localStorage.getItem('openAiModel') || 'gpt-4.1';
    const savedLangDockModel = localStorage.getItem('langDockModel') || 'gpt-4.1';

    setApiProvider(savedApiProvider);
    setOpenAiModel(savedOpenAiModel);
    setLangDockModel(savedLangDockModel);

    // API key is now in .env, so we assume it's configured
    setShowQuickStart(true);

  }, [refreshTrigger]);

  // Load templates for expert mode
  useEffect(() => {
    const savedTemplates = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
    setTemplates(savedTemplates);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (detectionTimeout) {
        clearTimeout(detectionTimeout);
      }
    };
  }, [detectionTimeout]);

  // Language configuration
  const languageConfig = {
    german: { flag: '🇩🇪', name: 'Deutsch' },
    english: { flag: '🇬🇧', name: 'Englisch' },
    french: { flag: '🇫🇷', name: 'Französisch' },
    italian: { flag: '🇮🇹', name: 'Italienisch' },
    spanish: { flag: '🇪🇸', name: 'Spanisch' }
  };

  const languagesEnglishGerman = {
    'english': 'Englisch',
    'french': 'Französisch',
    'italian': 'Italienisch',
    'spanish': 'Spanisch',
    'german': 'Deutsch'
  }

  const occasionsEnglishGerman = {
    'correspondence': 'Geschäftskorrespondenz',
    'negotiation': 'Verhandlungen & Preisdiskussion',
    'offer': 'Angebot & Nachfassen',
    'complaint': 'Reklamation',
    'appointment': 'Termin',
    'support': 'Support',
    'followup': 'Follow-up',
  }

  // const tonesEnglishGerman = {
  //   'formal': 'Formell',
  //   'friendly': 'Freundlich',
  //   'direct': 'Direkt',
  //   'sales-promoting': 'Verkaufsfördernd',
  //   'creative': 'Kreativ'
  // }

  const tonesEnglishGerman = {
    'concise': 'Prägnant',
    'persuasive': 'Überzeugend',
    'binding': 'Verbindlich',
    'personal': 'Persönlich'
  }
  

  const lengthsEnglishGerman = {
    'long': 'Lang',
    'short': 'Kurz'
  }

  // Language detection function
  const detectLanguage = (text: string) => {
    const lowerText = text.toLowerCase().trim();
    let detectedLang = null;

    // English detection
    if (lowerText.includes('hello') || lowerText.includes('dear') || lowerText.includes('best regards') ||
      lowerText.includes('thank you') || lowerText.includes('regards') || lowerText.includes('sincerely') ||
      lowerText.match(/\b(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|man|new|now|old|see|two|way|who|boy|did|its|let|put|say|she|too|use)\b/)) {
      detectedLang = 'english';
    }
    // French detection  
    else if (lowerText.includes('bonjour') || lowerText.includes('merci') || lowerText.includes('cordialement') ||
      lowerText.includes('salut') || lowerText.includes('bonsoir') ||
      lowerText.match(/\b(le|de|et|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|pouvoir|par|plus|dire|me|bien|aller|savoir|leur|si|voir|lui|nous|comme|temps|très|où|faire|ça|vouloir|grand|venir|après|sans|deux|même|prendre|encore|aussi|donner|année|avant|nos|contre|tout|pendant|sous|entre|depuis|jusqu)\b/)) {
      detectedLang = 'french';
    }
    // Spanish detection
    else if (lowerText.includes('hola') || lowerText.includes('gracias') || lowerText.includes('saludos') ||
      lowerText.includes('buenos días') || lowerText.includes('buenas') ||
      lowerText.match(/\b(que|de|no|un|el|la|ser|y|tener|hacer|estar|poder|decir|todo|haber|deber|ir|ver|dar|saber|querer|llegar|pasar|tiempo|muy|sobre|año|antes|mismo|otro|forma|mucho|país|nacional|donde|casa|durante|siempre|día|tanto|tres|menos|problema|mano|segundo|momento|caso|contra|partido|después|trabajo|vida|mundo|cada|hasta|agua|parte|mayor|nuevo|otros|muchos|ciudad|primera|toda|dar|lugar|gobierno|gran|poco|grupo|vez|país|pueblo|fin|manera|bajo|mejor|sistema|cada|estado|nada|guerra|entre|mientras|vida|trabajar|siempre|gobierno)\b/)) {
      detectedLang = 'spanish';
    }
    // Italian detection
    else if (lowerText.includes('ciao') || lowerText.includes('grazie') || lowerText.includes('cordiali saluti') ||
      lowerText.includes('buongiorno') || lowerText.includes('salve') ||
      lowerText.match(/\b(che|di|un|il|la|essere|avere|fare|dire|andare|potere|dovere|volere|sapere|dare|stare|venire|uscire|parlare|mettere|portare|sentire|servire|vivere|partire|credere|vendere|leggere|perdere|decidere|rimanere|diventare|morire|aprire|chiudere|permettere|apparire|offrire|coprire|scoprire|soffrire)\b/)) {
      detectedLang = 'italian';
    }

    return detectedLang;
  };

  // Translation function using server action
  const translateTextClient = async (text: string, targetLanguage: string) => {
    const currentModel = apiProvider === 'openai' ? openAiModel : langDockModel;
    const result = await translateText(text, targetLanguage, apiProvider, currentModel);

    if (result.success) {
      return result.response!;
    } else {
      throw new Error(result.error);
    }
  };

  // Auto-translation function for input text (English -> German)
  const translateInputTextAutomatic = async (text: string, detectedLang: string) => {
    try {
      setIsTranslating(true);
      const translation = await translateTextClient(text, 'german');
      if (translation) {
        setInputTranslation(translation);
        setShowInputTranslation(true);
      }
    } catch (error) {
      console.log('Auto-translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  // Format email text for display (from original HTML)
  const formatEmailText = (text: string) => {
    if (!text) return '';

    // Convert line breaks to HTML
    let formatted = text.replace(/\n/g, '<br>');

    // Convert double line breaks to paragraphs
    formatted = formatted.replace(/(<br>\s*){2,}/g, '</p><p>');
    formatted = '<p>' + formatted + '</p>';

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><br><\/p>/g, '');
    formatted = formatted.replace(/<p><\/p>/g, '');

    return formatted;
  };


  // Rating system
  const handleRateEmail = (rating: number) => {
    setCurrentRating(rating);

    // Save rating to current email data if it exists
    if (parsedData) {
      const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
      const updatedHistory = history.map((item: any) => {
        if (item.timestamp === parsedData.timestamp) {
          return { ...item, rating };
        }
        return item;
      });
      localStorage.setItem('emailHistory', JSON.stringify(updatedHistory));
    }

    showToast?.('success', `Bewertung gespeichert: ${rating} Stern${rating !== 1 ? 'e' : ''}`);
  };

  const resetRating = () => {
    setCurrentRating(0);
  };

  // Debounced language detection

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEmailInput(text);

    // Skip translation in improve mode since we're working with generated email
    if (isImproveMode) {
      return;
    }

    // Clear existing timeout
    if (detectionTimeout) {
      clearTimeout(detectionTimeout);
    }
    // Set new timeout for language detection
    const timeout = setTimeout(() => {
      const detectedLang = detectLanguage(text);
      setDetectedLanguage(detectedLang);

      // Auto-translate if language is English and text is substantial
      if (detectedLang === 'english' && text.length > 30) {
        translateInputTextAutomatic(text, detectedLang);
      } else {
        setShowInputTranslation(false);
        setInputTranslation('');
      }
    }, 2500); // 2.5 second delay after user stops typing

    setDetectionTimeout(timeout);
  };

  // Voice input handlers
  const handleVoiceInput = (text: string) => {
    setEmailInput(prev => prev + (prev ? ' ' : '') + text);
  };

  const handleVoiceInstructions = (text: string) => {
    setCustomInstructions(prev => prev + (prev ? ' ' : '') + text);
  };

  const handleVoiceTone = (text: string) => {
    setCustomTone(prev => prev + (prev ? ' ' : '') + text);
  };

  // Recording state handlers
  const handleRecordingStateChange = (isRecording: boolean) => {
    setIsAnyRecording(isRecording);
  };

  // Template selection handler
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);

    if (templateId === '') {
      // Clear custom instructions when no template is selected
      setCustomInstructions('');
    } else {
      // Find the selected template
      const selectedTemplateData = templates.find(template => template.id.toString() === templateId);
      if (selectedTemplateData) {
        // Format the template body as requested
        const templateInstruction = `Basiere die Antwort auf dieser Vorlage:\n\n${selectedTemplateData.content}`;
        setCustomInstructions(templateInstruction);
      }
    }
  };

  // Quick start functions for simple mode
  const quickStart = (type: 'antwort' | 'neu') => {
    if (type === 'antwort') {
      setSelectedResponseType('antwort');
      setEmailPlaceholder('Fügen Sie hier die E-Mail ein, auf die Sie antworten möchten...');
      setCustomInstructionsPlaceholder('Zusätzliche Anweisungen für die E-Mail-Generierung (optional)...');
    } else if (type === 'neu') {
      setSelectedResponseType('neu');
      setEmailPlaceholder('Beschreiben Sie kurz, worum es in der neuen E-Mail gehen soll...');
      setCustomInstructionsPlaceholder('Z.B.: An: Max Mustermann von Firma ABC\nBetreff: Unser Angebot\nInhalt: Bitte um Rückmeldung zum Angebot...');
    }

    // Focus on email input
    const emailInputElement = document.getElementById('emailInput') as HTMLTextAreaElement;
    if (emailInputElement) {
      emailInputElement.focus();
    }

    // Scroll to input area
    const mainInputArea = document.getElementById('mainInputArea');
    if (mainInputArea) {
      mainInputArea.scrollIntoView({ behavior: 'smooth' });
    }
  };


  // Parse API response
  const parseApiResponse = (response: string) => {
    const lines = response.split('\n');
    let subject = '';
    let email = '';
    let isEmailSection = false;

    for (let line of lines) {
      line = line.trim();

      if (line.startsWith('BETREFF:')) {
        subject = line.replace('BETREFF:', '').trim();
      } else if (line === 'EMAIL:' || line.startsWith('EMAIL:')) {
        isEmailSection = true;
        continue;
      } else if (isEmailSection && line) {
        email += line + '\n';
      }
    }

    // If no clear structure found, try alternative parsing
    if (!subject && !email) {
      // Look for subject line patterns
      const subjectMatch = response.match(/(?:Betreff|Subject):\s*(.+)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        email = response.replace(subjectMatch[0], '').trim();
      } else {
        // Use first line as subject, rest as email
        const firstNewline = response.indexOf('\n');
        if (firstNewline > 0) {
          subject = response.substring(0, firstNewline).trim();
          email = response.substring(firstNewline).trim();
        } else {
          email = response;
        }
      }
    }

    return {
      subject: subject || 'E-Mail Antwort',
      email: email || response
    };
  };


  const handleGenerateEmail = async () => {
    // If in improve mode, use the improvement function instead
    if (isImproveMode) {
      await handleImproveEmail();
      return;
    }

    await handleRegularGenerateEmail();
  };

  const handleRegularGenerateEmail = async () => {

    if (!emailInput.trim()) {
      showToast?.('warning', 'Bitte geben Sie eine E-Mail oder einen Kontext ein.');
      return;
    }

    // Validate required fields for simple mode
    if (isSimpleMode) {
      // if (!selectedOccasion) {
      //   showToast?.('warning', 'Bitte wählen Sie einen Geschäftsanlass aus.');
      //   return;
      // }

      if (!selectedTone) {
        showToast?.('warning', 'Bitte wählen Sie einen Antwortton aus.');
        return;
      }

      // if (!selectedEmailLength) {
      //   showToast?.('warning', 'Bitte wählen Sie eine E-Mail-Länge aus.');
      //   return;
      // }
    } else {
      if (!selectedOccasion) {
        showToast?.('warning', 'Bitte wählen Sie einen Geschäftsanlass aus.');
        return;
      }

      if (!selectedTone) {
        showToast?.('warning', 'Bitte wählen Sie einen Antwortton aus.');
        return;
      }

      // if (!selectedEmailLength) {
      //   showToast?.('warning', 'Bitte wählen Sie eine E-Mail-Länge aus.');
      //   return;
      // }
    }

    // Clear previous translation when generating new email
    setShowOutputTranslation(false);
    setOutputTranslation('');
    setShowResult(false);
    // Reset rating for new email
    resetRating();

    setIsGenerating(true);

    try {
      // Use server action instead of direct API call
      const result = await generateEmail({
        emailInput,
        customInstructions,
        selectedOccasion,
        selectedTone,
        selectedLanguage,
        customTone,
        selectedResponseType,
        // selectedEmailLength,
        apiProvider,
        selectedModel: apiProvider === 'openai' ? openAiModel : langDockModel
      });

      if (result.success) {
        const parsedData = parseApiResponse(result.response!);
        // setGenerationUsage(result.usage || null);
        // setGenerationModel(result.model || null);
        const timestamp = new Date().toISOString();
        const parsedDataWithTimestamp = { ...parsedData, timestamp };
        setParsedData(parsedDataWithTimestamp);
        setGeneratedEmail(parsedData.email);
        setShowResult(true);
        // Reset improve mode for new generation
        setIsImproveMode(false);

        // Scroll to the generated response after a short delay to ensure DOM is updated
        setTimeout(() => {
          const responseElement = document.getElementById('outputSection');
          if (responseElement) {
            responseElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100);


        // Save to history
        const historyItem = {
          id: Date.now(),
          timestamp: timestamp,
          originalEmail: emailInput,
          generatedEmail: parsedData.email,
          subject: parsedData.subject,
          settings: {
            language: languagesEnglishGerman[selectedLanguage as keyof typeof languagesEnglishGerman] || selectedLanguage,
            occasion: occasionsEnglishGerman[selectedOccasion as keyof typeof occasionsEnglishGerman] || selectedOccasion,
            tone: tonesEnglishGerman[selectedTone as keyof typeof tonesEnglishGerman] || selectedTone,
            // emailLength: lengthsEnglishGerman[selectedEmailLength as keyof typeof lengthsEnglishGerman] || selectedEmailLength,
            customTone: customTone,
            template: selectedTemplate,
            customInstructions: customInstructions
          }
        };

        const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
        history.unshift(historyItem);
        localStorage.setItem('emailHistory', JSON.stringify(history));
      } else {
        showToast?.('error', `Fehler: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating email:', error);
      showToast?.('error', 'Fehler bei der E-Mail-Generierung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(generatedEmail);
    showToast?.('success', 'E-Mail in die Zwischenablage kopiert!');
  };

  const handleRegenerateEmail = async () => {
    setShowResult(false);
    await handleGenerateEmail();
  };

  const handleStartImprove = () => {
    if (!generatedEmail?.trim()) return;
    // Move generated email to input, hide result and guide user to improvements
    setEmailInput(generatedEmail);
    setShowResult(false);
    setIsImproveMode(true);
    // Clear input translation when entering improve mode
    setShowInputTranslation(false);
    setInputTranslation('');
    setCustomInstructionsPlaceholder('Beschreiben Sie die gewünschten Verbesserungen (z. B. kürzer, höflicher, mehr Details)…');
    showToast?.('info', 'E-Mail übernommen. Ergänzen Sie gewünschte Verbesserungen und klicken Sie auf „E‑Mail generieren".');
    // Focus improvements field
    setTimeout(() => {
      const el = document.getElementById('customInstructions') as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }, 0);
  };

  const handleImproveEmail = async () => {
    if (!emailInput.trim() || !customInstructions.trim()) {
      showToast?.('warning', 'Bitte geben Sie Verbesserungsanweisungen ein.');
      return;
    }

    // Clear previous translation when improving email
    setShowOutputTranslation(false);
    setOutputTranslation('');
    setShowResult(false);
    // Reset rating for improved email
    resetRating();

    setIsGenerating(true);

    try {
      // Use the dedicated improvement function
      const result = await improveEmail({
        currentEmail: emailInput,
        improvementInstructions: customInstructions,
        selectedOccasion,
        selectedTone,
        // selectedEmailLength,
        selectedLanguage,
        apiProvider,
        selectedModel: apiProvider === 'openai' ? openAiModel : langDockModel
      });

      if (result.success) {
        const parsedData = parseApiResponse(result.response!);
        const timestamp = new Date().toISOString();
        const parsedDataWithTimestamp = { ...parsedData, timestamp };
        setParsedData(parsedDataWithTimestamp);
        setGeneratedEmail(parsedData.email);
        setShowResult(true);
        // Improvement step completed
        setIsImproveMode(false);

        // Scroll to the generated response after a short delay to ensure DOM is updated
        setTimeout(() => {
          const responseElement = document.getElementById('outputSection');
          if (responseElement) {
            responseElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100);

        // Save to history
        const historyItem = {
          id: Date.now(),
          timestamp: timestamp,
          originalEmail: emailInput,
          generatedEmail: parsedData.email,
          subject: parsedData.subject,
          settings: {
            language: languagesEnglishGerman[selectedLanguage as keyof typeof languagesEnglishGerman] || selectedLanguage,
            occasion: occasionsEnglishGerman[selectedOccasion as keyof typeof occasionsEnglishGerman] || selectedOccasion,
            tone: tonesEnglishGerman[selectedTone as keyof typeof tonesEnglishGerman] || selectedTone,
            // emailLength: lengthsEnglishGerman[selectedEmailLength as keyof typeof lengthsEnglishGerman] || selectedEmailLength,
            customTone: customTone,
            template: selectedTemplate,
            customInstructions: customInstructions,
            isImproved: true
          }
        };

        const history = JSON.parse(localStorage.getItem('emailHistory') || '[]');
        history.unshift(historyItem);
        localStorage.setItem('emailHistory', JSON.stringify(history));
      } else {
        showToast?.('error', `Fehler: ${result.error}`);
      }
    } catch (error) {
      console.error('Error improving email:', error);
      showToast?.('error', 'Fehler bei der E-Mail-Verbesserung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Translate generated email to German
  const handleTranslateToGerman = async () => {
    if (!parsedData) return;

    try {
      setIsTranslating(true);

      // Use server actions for translation
      const currentModel = apiProvider === 'openai' ? openAiModel : langDockModel;
      const [emailResult, subjectResult] = await Promise.all([
        translateText(parsedData.email, 'german', apiProvider, currentModel),
        translateText(parsedData.subject, 'german', apiProvider, currentModel)
      ]);

      if (emailResult.success && subjectResult.success) {
        // setTranslationUsage(emailResult.usage || subjectResult.usage || null);
        // setTranslationModel(emailResult.model || subjectResult.model || null);
        // Create formatted translation with subject and email
        const formattedTranslation = `Betreff: ${subjectResult.response}\n\n${emailResult.response}`;

        // Show translation in the output translation box (don't modify original)
        setOutputTranslation(formattedTranslation);
        setShowOutputTranslation(true);

        // Scroll to the translation box
        setTimeout(() => {
          const translationElement = document.getElementById('outputTranslation');
          if (translationElement) {
            translationElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }
        }, 100);

        showToast?.('success', 'E-Mail erfolgreich ins Deutsche übersetzt!');
      } else {
        throw new Error('Übersetzung konnte nicht durchgeführt werden');
      }
    } catch (error) {
      console.error('Translation error:', error);
      showToast?.('error', `Übersetzungsfehler: ${error}`);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveAsTemplate = () => {
    const templateName = prompt('Bitte geben Sie einen Namen für die Vorlage ein:');
    if (templateName) {
      const template = {
        id: Date.now(),
        name: templateName,
        content: generatedEmail,
        createdAt: new Date().toISOString()
      };

      const templates = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
      templates.push(template);
      localStorage.setItem('emailTemplates', JSON.stringify(templates));

      showToast?.('success', 'Vorlage erfolgreich gespeichert!');
    }
  };

  return (
    <div id="generatorTab" className="tab-content active">

      {showQuickStart && (
        <div id="quickStartBox" className="simple-mode-only" style={{
          display: 'block',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))',
          border: '2px solid var(--border-color)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <h2 className='text-2xl font-bold' style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>🚀 Schnellstart</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <button
              className={`quick-action-btn ${selectedResponseType === 'antwort' ? 'active' : ''}`}
              onClick={() => quickStart('antwort')}
            >
              <div style={{ marginBottom: '10px' }}>
                <Mail className="h-8 w-8 text-[#667eea] inline-block" />
              </div>
              <div className={selectedResponseType === 'antwort' ? 'text-primary' : ''} style={{ fontWeight: '600' }}>E-Mail beantworten</div>
              <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginTop: '5px' }}>Auf erhaltene E-Mail antworten</div>
            </button>
            <button
              className={`quick-action-btn ${selectedResponseType === 'neu' ? 'active' : ''}`}
              onClick={() => quickStart('neu')}
            >
              <div style={{ marginBottom: '10px' }}>
                <Edit3 className="h-8 w-8 text-[#667eea] inline-block" />
              </div>
              <div className={selectedResponseType === 'neu' ? 'text-primary' : ''} style={{ fontWeight: '600' }}>Neue E-Mail schreiben</div>
              <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginTop: '5px' }}>Neue Nachricht verfassen</div>
            </button>
          </div>
        </div>
      )}

      {/* Simple Mode Language Selection - comes after quick start */}
      {isSimpleMode && (
        <div id="simpleLanguageSelect" className="simple-mode-only" style={{ display: 'block', marginBottom: '20px', textAlign: 'center' }}>
          <label style={{ fontWeight: '600', marginRight: '10px' }}>Sprache der Antwort:</label>
          <select
            id="simpleLanguage"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="german">🇩🇪 Deutsch</option>
            <option value="english">🇬🇧 Englisch</option>
            <option value="french">🇫🇷 Französisch</option>
            <option value="italian">🇮🇹 Italienisch</option>
            <option value="spanish">🇪🇸 Spanisch</option>
          </select>
        </div>
      )}

      {!isSimpleMode && (
        <div className="model-config expert-mode-only" id="advancedConfig">
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              background: 'var(--info-bg)',
              border: '1px solid var(--info-border)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '10px' }}>
                Aktiver API-Provider: {apiProvider === 'openai' ? 'OpenAI' : 'LangDock'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label htmlFor="modelSelect">KI-Modell auswählen:</label>
              <select
                className="model-select"
                id="modelSelect"
                value={apiProvider === 'openai' ? openAiModel : langDockModel}
                onChange={(e) => {
                  if (apiProvider === 'openai') {
                    setOpenAiModel(e.target.value);
                  } else {
                    setLangDockModel(e.target.value);
                  }
                }}
              >
                {apiProvider === 'openai' ? (
                  <>
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 Mini</option>
                    <option value="gpt-5-nano">GPT-5 Nano</option>
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o-nano">GPT-4o Nano</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="o1-preview">o1-preview</option>
                    <option value="o1-mini">o1-mini</option>
                  </>
                ) : (
                  <>
                    <option value="gpt-5">GPT-5</option>
                    <option value="gpt-5-mini">GPT-5 Mini</option>
                    <option value="gpt-5-nano">GPT-5 Nano</option>
                    <option value="gpt-4.1">GPT-4.1</option>
                    <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
                    <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="o3-mini">o3-mini</option>
                    <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
                    <option value="claude-3-7-sonnet-20250219">Claude Sonnet 3.7</option>
                    <option value="claude-3-5-sonnet-20240620">Claude Sonnet 3.5</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="languageSelect">Antwortsprache:</label>
              <select
                className="model-select"
                id="languageSelect"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="german">Deutsch</option>
                <option value="english">Englisch</option>
                <option value="french">Französisch</option>
                <option value="italian">Italienisch</option>
                <option value="spanish">Spanisch</option>
                <option value="chinese">Chinesisch (vereinfacht)</option>
                <option value="dutch">Niederländisch</option>
                <option value="polish">Polnisch</option>
                <option value="turkish">Türkisch</option>
                <option value="russian">Russisch</option>
              </select>
            </div>
          </div>
        </div>
      )}


      {!isSimpleMode && (
        <div className="template-selection expert-mode-only">
          <label htmlFor="templateSelect">Vorlage verwenden (optional):</label>
          <select
            className="template-select"
            id="templateSelect"
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
          >
            <option value="">-- Keine Vorlage --</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <small style={{ display: 'block', marginTop: '5px', color: 'var(--text-muted)' }}>
            Nutzen Sie eine Ihrer gespeicherten Vorlagen als Basis für Stil und Aufbau
          </small>
        </div>
      )}

      {/* {!isSimpleMode && (
        <div className="step-indicator expert-only">
          <div className="step active" id="step1">
            <div className="step-number">1</div>
            <div className="step-title">E-Mail/Kontext</div>
          </div>
          <div className="step" id="step2">
            <div className="step-number">2</div>
            <div className="step-title">Stil wählen</div>
          </div>
          <div className="step" id="step3">
            <div className="step-number">3</div>
            <div className="step-title">Antwort erhalten</div>
          </div>
        </div>
      )} */}

      <div id="mainInputArea" style={{ display: 'block' }}>
        <div className="input-section">
          <label htmlFor="emailInput" id="emailInputLabel">
            {isSimpleMode ? (
              selectedResponseType === 'antwort' ? (
                <>Empfangene E-Mail einfügen: <small style={{ color: 'var(--text-muted)' }}>(Was möchten Sie beantworten?)</small></>
              ) : (
                <>Kontext eingeben: <small style={{ color: 'var(--text-muted)' }}>(Was möchten Sie schreiben?)</small></>
              )
            ) : (
              <>
                Empfangene E-Mail einfügen:
                {detectedLanguage && (
                  <span id="detectedLanguage" className="language-indicator" style={{ display: 'inline-flex' }}>
                    <span className="flag-icon" id="langFlag">{languageConfig[detectedLanguage as keyof typeof languageConfig]?.flag}</span>
                    <span id="langName">{languageConfig[detectedLanguage as keyof typeof languageConfig]?.name}</span>
                  </span>
                )}
              </>
            )}
          </label>
          <div className="textarea-with-voice">
            <textarea
              id="emailInput"
              rows={8}
              value={emailInput}
              onChange={handleEmailInputChange}
              placeholder={emailPlaceholder}
              disabled={isAnyRecording}
            />
            <VoiceInput
              onTranscription={handleVoiceInput}
              placeholder="Voice input for email content"
              disabled={isGenerating}
              onRecordingStateChange={handleRecordingStateChange}
            />
          </div>

          {/* Translation Box for Input */}
          {showInputTranslation && (
            <div id="inputTranslation" className="translation-box" style={{ display: 'block' }}>
              <div className="translation-header">
                <div className="translation-title">
                  🌍 Übersetzung
                  <span className="language-indicator">
                    <span className="flag-icon">🇩🇪</span>
                    <span>Deutsch</span>
                  </span>
                </div>
                <button
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(inputTranslation);
                    // You could add a toast notification here
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Kopieren
                </button>
              </div>
              <div className="translation-text" id="inputTranslationText">
                {isTranslating ? 'Übersetzung läuft...' : inputTranslation}
              </div>
            </div>
          )}
        </div>

        <div className="custom-instructions" id="customInstructionsDiv">
          <label htmlFor="customInstructions" id="customInstructionsLabel">Weitere Details (optional):</label>
          <div className="textarea-with-voice">
            <textarea
              id="customInstructions"
              rows={3}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder={customInstructionsPlaceholder}
              disabled={isAnyRecording}
            />
            <VoiceInput
              onTranscription={handleVoiceInstructions}
              placeholder="Voice input for custom instructions"
              disabled={isGenerating}
              onRecordingStateChange={handleRecordingStateChange}
            />
          </div>
        </div>

        {/* Simple Mode Occasion Selection */}
        {/* {isSimpleMode && (
        <div id="simpleOccasionSelect" className="simple-mode-only" style={{ display: 'block', marginBottom: '30px' }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '15px' }}>Worum geht es in der E-Mail?</label>
          <select 
            id="simpleOccasion" 
            value={selectedOccasion}
            onChange={(e) => setSelectedOccasion(e.target.value)}
            style={{ width: '100%', padding: '12px 20px', border: '2px solid var(--border-color)', borderRadius: '8px', fontSize: '16px', background: 'var(--input-bg)', color: 'var(--text-primary)' }}
          >
            <option value="">-- Bitte wählen --</option>
              <option value="correspondence">Geschäftskorrespondenz</option>
              <option value="offer">Angebot & Nachfassen</option>
              <option value="complaint">Reklamation</option>
              <option value="appointment">Termin</option>
              <option value="support">Support</option>
            <option value="followup">Follow-up</option>
          </select>
        </div>
      )} */}

        {/* Simple Mode Intention Selection */}
        {isSimpleMode && (
          <div id="simpleIntentionSelect" className="simple-mode-only" style={{ display: 'block', marginBottom: '30px', marginTop: '30px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '15px' }}>Wie soll die E-Mail klingen?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px' }}>
              {/* <button
                className={`style-btn ${selectedTone === 'formal' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('formal')}
                style={{
                  padding: '15px',
                  background: selectedTone === 'formal' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'formal' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <FileText className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Formell</div>
              </button>
              <button
                className={`style-btn ${selectedTone === 'friendly' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('friendly')}
                style={{
                  padding: '15px',
                  background: selectedTone === 'friendly' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'friendly' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <Smile className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Freundlich</div>
              </button> */}
              {/* <button
                className={`style-btn ${selectedTone === 'direct' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('direct')}
                style={{
                  padding: '15px',
                  background: selectedTone === 'direct' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'direct' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <ArrowDownToDot className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Direkt</div>
              </button>
              <button
                className={`style-btn ${selectedTone === 'sales-promoting' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('sales-promoting')}
                style={{
                  padding: '15px',
                  background: selectedTone === 'sales-promoting' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'sales-promoting' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <BadgeEuro className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Verkaufsfördernd</div>
              </button> */}

              <button
                className={`style-btn ${selectedTone === 'concise' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('concise')}
                data-tooltip="Kurz, klar, ohne Umwege – ideal für Bestätigungen und schnelle Infos."
                style={{
                  padding: '15px',
                  background: selectedTone === 'concise' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'concise' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {/* <div style={{ fontSize: '1.5em' }}>👔</div> */}
                {/* <FileText className="h-7 w-7 text-[#667eea] inline-block" /> */}
                <ArrowDownWideNarrow className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Prägnant</div>
              </button>
              <button
                className={`style-btn ${selectedTone === 'persuasive' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('persuasive')}
                data-tooltip="Verkaufsstark mit Call-to-Action – perfekt für Angebote und Upselling."
                style={{
                  padding: '15px',
                  background: selectedTone === 'persuasive' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'persuasive' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {/* <div style={{ fontSize: '1.5em' }}>😊</div> */}
                {/* <Smile className="h-7 w-7 text-[#667eea] inline-block" /> */}
                <Target className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Überzeugend</div>
              </button>
              <button
                className={`style-btn ${selectedTone === 'binding' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('binding')}
                data-tooltip="Professionell und vertrauensbildend – für Vereinbarungen und Verhandlungen."
                style={{
                  padding: '15px',
                  background: selectedTone === 'binding' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'binding' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {/* <div style={{ fontSize: '1.5em' }}>👔</div> */}
                {/* <FileText className="h-7 w-7 text-[#667eea] inline-block" /> */}
                <Shield className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Verbindlich</div>
              </button>
              <button
                className={`style-btn ${selectedTone === 'personal' ? 'selected' : ''}`}
                onClick={() => setSelectedTone('personal')}
                data-tooltip="Locker, nahbar und kundenorientiert – für Follow-ups und Kundenpflege."
                style={{
                  padding: '15px',
                  background: selectedTone === 'personal' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedTone === 'personal' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {/* <div style={{ fontSize: '1.5em' }}>😊</div> */}
                <Smile className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>Persönlich</div>
              </button>
            </div>
          </div>
        )}

        {/* Simple Mode Intention Selection */}
        {/* {isSimpleMode && (
          <div id="simpleIntentionSelect" className="simple-mode-only" style={{ display: 'block', marginBottom: '30px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '15px' }}>Wie soll die E-Mail sein?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px' }}>
              <button
                className={`style-btn ${selectedEmailLength === 'long' ? 'selected' : ''}`}
                onClick={() => setSelectedEmailLength('long')}
                style={{
                  padding: '15px',
                  background: selectedEmailLength === 'long' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedEmailLength === 'long' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <ScrollText className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}>lang</div>
              </button>
              <button
                className={`style-btn ${selectedEmailLength === 'short' ? 'selected' : ''}`}
                onClick={() => setSelectedEmailLength('short')}
                style={{
                  padding: '15px',
                  background: selectedEmailLength === 'short' ? 'var(--info-bg)' : 'var(--input-bg)',
                  border: `2px solid ${selectedEmailLength === 'short' ? 'var(--info-border)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                <ArrowDownWideNarrow className="h-7 w-7 text-[#667eea] inline-block" />
                <div style={{ fontWeight: '600', marginTop: '5px' }}> kurz</div>
              </button>
            </div>
          </div>
        )} */}

        {!isSimpleMode && (
          <div className="intention-section expert-mode-only">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label htmlFor="occasionSelect">Geschäftsanlass:</label>
                <select
                  className="model-select"
                  id="occasionSelect"
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                >
                  <option value="">-- Bitte wählen --</option>
                  <option value="correspondence">Normale Geschäftskorrespondenz</option>
                  <option value="negotiation">Verhandlungen & Preisdiskussion</option>
                  <option value="offer">Angebotserstellung & -nachfassung</option>
                  <option value="complaint">Reklamationsbearbeitung</option>
                  <option value="appointment">Terminvereinbarung & -koordination</option>
                  <option value="project">Projektabstimmung & Updates</option>
                  <option value="support">Kundensupport & Hilfestellung</option>
                  <option value="contract">Vertragsdiskussion & -klärung</option>
                  <option value="followup">Nachfassen & Follow-up</option>
                  <option value="partnership">Partnerschafts- & Kooperationsanfrage</option>
                  <option value="onboarding">Kunden-Onboarding & Einführung</option>
                  <option value="feedback">Feedback-Anfrage & Bewertung</option>
                </select>
              </div>
              <div>
                <label htmlFor="toneSelect">Antwortton:</label>
                <select
                  className="model-select"
                  id="toneSelect"
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                >
                  <option value="">-- Bitte wählen --</option>
                  <option value="">-- Bitte wählen --</option>
                  <option value="concise">Prägnant – Kurz, klar & effizient</option>
                  <option value="persuasive">Überzeugend – Verkaufsstark & aktivierend</option>
                  <option value="binding">Verbindlich – Präzise, zuverlässig & seriös</option>
                  <option value="personal">Persönlich – Freundlich, nahbar & kundenorientiert</option>
                  {/* <option value="formal">Formell - Professionell & geschäftlich</option>
                  <option value="friendly">Freundlich - Warm & persönlich</option>
                  <option value="direct">Direkt - Klar & prägnant</option>
                  <option value="sales-promoting">Verkaufsfördernd - Überzeugend & motivierend</option>
                  <option value="creative">Kreativ - Originell & einprägsam</option> */}
                </select>
              </div>

              {/* <div>
                <label htmlFor="emailLengthSelect">E-Mail-Länge:</label>
                <select
                  className="model-select"
                  id="emailLengthSelect"
                  value={selectedEmailLength}
                  onChange={(e) => setSelectedEmailLength(e.target.value)}
                >
                  <option value="">-- Bitte wählen --</option>
                  <option value="long">Lang</option>
                  <option value="short">Kurz</option>
                </select>
              </div> */}
            </div>
          </div>
        )}

        {!isSimpleMode && (
          <div style={{ marginTop: '20px' }}>
            <label htmlFor="customTone">Eigene Tonalität hinzufügen (optional):</label>
            <div className="textarea-with-voice">
              <textarea
                id="customTone"
                rows={3}
                value={customTone}
                onChange={(e) => setCustomTone(e.target.value)}
                placeholder="z.B.: Mit einem Hauch von Humor, besonders empathisch, sehr technisch und detailliert, enthusiastisch und motivierend..."
                disabled={isAnyRecording}
              />
              <VoiceInput
                onTranscription={handleVoiceTone}
                placeholder="Voice input for custom tone"
                disabled={isGenerating}
                onRecordingStateChange={handleRecordingStateChange}
              />
            </div>
          </div>
        )}

        <div className="generate-section">
          <button
            className="generate-button"
            id="generateBtn"
            onClick={handleGenerateEmail}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="loading"></span>
                {
                  selectedResponseType === 'antwort' ? (
                    <span>Generiere Antwort...</span>
                  ) : (
                    <span>Generiere E-Mail...</span>
                  )
                }
              </>
            ) : (

              <span id="generateBtnText">{isImproveMode ? '🔄 E‑Mail verbessern' : '✨ E‑Mail generieren'}</span>
            )}
          </button>
        </div>
      </div>

      {showResult && (
        <div className="output-section" id="outputSection" style={{ display: 'block', marginTop: '20px' }}>
          {/* Betreff-Box */}
          <div className="subject-box">
            <div className="response-header">
              <h3 className="response-title">Betreff:</h3>
              <button className="copy-button" onClick={() => {
                navigator.clipboard.writeText(parsedData?.subject || '');
                showToast?.('success', 'Betreff in die Zwischenablage kopiert!');
              }}>
                <Copy className="h-4 w-4" />
                Kopieren
              </button>
            </div>
            <input
              type="text"
              className="subject-input"
              id="subjectLine"
              value={parsedData?.subject || ''}
              readOnly
            />
          </div>

          {/* E-Mail-Box */}
          <div className="response-box">
            <div className="response-header">
              <h3 className="response-title" id="emailTitle">
                Ihre E-Mail-Antwort:
                <span id="responseLanguage" className="language-indicator" style={{ display: 'none' }}>
                  <span className="flag-icon" id="responseLangFlag"></span>
                  <span id="responseLangName"></span>
                </span>
              </h3>
              <div>
                {!isSimpleMode && (
                  <button className="copy-button" onClick={handleSaveAsTemplate}>
                    <Save className="h-4 w-4" />
                    Als Vorlage speichern
                  </button>
                )}
                <button className="copy-button" onClick={handleCopyEmail}>
                  <Copy className="h-4 w-4" />
                  Kopieren
                </button>
                <button className="copy-button" onClick={handleStartImprove}>
                  <Wrench className="h-4 w-4" />
                  E‑Mail verbessern
                </button>
              </div>
            </div>
            <div className="response-text" id="responseText" dangerouslySetInnerHTML={{ __html: formatEmailText(generatedEmail) }}></div>
            {/* {generationUsage && (
              <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Modell: {generationModel || '-'} · Tokens: {generationUsage?.prompt_tokens ?? '-'} / {generationUsage?.completion_tokens ?? '-'} · Total: {generationUsage?.total_tokens ?? '-'}
              </div>
            )} */}

            {/* Translation Box for Output */}
            {showOutputTranslation && (
              <div id="outputTranslation" className="translation-box" style={{ display: 'block' }}>
                <div className="translation-header">
                  <div className="translation-title">
                    🌍 Deutsche Übersetzung
                    <span className="language-indicator">
                      <span className="flag-icon">🇩🇪</span>
                      <span>Deutsch</span>
                    </span>
                  </div>
                  <button className="copy-button" onClick={() => navigator.clipboard.writeText(outputTranslation)}>
                    <Copy className="h-4 w-4" />
                    Kopieren
                  </button>
                </div>
                <div className="translation-text" id="outputTranslationText" dangerouslySetInnerHTML={{ __html: formatEmailText(outputTranslation) }}></div>
                {/* {translationUsage && (
                  <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Modell: {translationModel || '-'} · Tokens: {translationUsage?.prompt_tokens ?? '-'} / {translationUsage?.completion_tokens ?? '-'} · Total: {translationUsage?.total_tokens ?? '-'}
                  </div>
                )} */}
              </div>
            )}
          </div>

          {/* Translation Button */}
          {!outputTranslation && selectedLanguage !== 'german' && (
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <button
                className="translate-button"
                id="translateBtn"
                onClick={handleTranslateToGerman}
                disabled={isTranslating}
              >
                <span>🌍</span>
                <span id="translateBtnText">
                  {isTranslating ? 'Übersetze...' : 'E-Mail ins Deutsche übersetzen'}
                </span>
              </button>
            </div>
          )}

          {/* Rating Section */}
          <div className="rating-section">
            <div className="rating-title">Wie zufrieden sind Sie mit dieser E-Mail?</div>
            <div className="star-rating" id="currentRating">
              {[1, 2, 3, 4, 5].map((rating) => (
                <span
                  key={rating}
                  className={`star ${rating <= currentRating ? 'filled' : ''}`}
                  onClick={() => handleRateEmail(rating)}
                >
                  {rating <= currentRating ? '★' : '☆'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
