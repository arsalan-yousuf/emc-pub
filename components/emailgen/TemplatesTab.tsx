'use client';

import { useState, useEffect } from 'react';
import { Edit3, Trash2, X, Copy } from 'lucide-react';

interface Template {
  id: number;
  name: string;
  content: string;
  createdAt: string;
}

interface TemplatesTabProps {
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', message: string, duration?: number) => void;
}

export default function TemplatesTab({ showToast }: TemplatesTabProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Load templates from localStorage
  useEffect(() => {
    const savedTemplates = JSON.parse(localStorage.getItem('emailTemplates') || '[]');
    setTemplates(savedTemplates);
  }, []);

  const handleSaveTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      showToast?.('warning', 'Bitte geben Sie einen Namen und Inhalt für die Vorlage ein.');
      return;
    }

    const newTemplate: Template = {
      id: Date.now(),
      name: templateName.trim(),
      content: templateContent.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    localStorage.setItem('emailTemplates', JSON.stringify(updatedTemplates));

    // Reset form
    setTemplateName('');
    setTemplateContent('');
    setSelectedTemplate(null);
    setIsEditing(false);
    
    showToast?.('success', 'Vorlage erfolgreich gespeichert!');
  };

  const handleEditTemplate = (template: Template) => {
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setSelectedTemplate(template); // Keep this for tracking which template is being edited
    setIsEditing(true);
  };

  const handleUpdateTemplate = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      showToast?.('warning', 'Bitte geben Sie einen Namen und Inhalt für die Vorlage ein.');
      return;
    }

    const updatedTemplates = templates.map(template =>
      template.id === selectedTemplate?.id
        ? { ...template, name: templateName.trim(), content: templateContent.trim() }
        : template
    );

    setTemplates(updatedTemplates);
    localStorage.setItem('emailTemplates', JSON.stringify(updatedTemplates));

    // Reset form
    setTemplateName('');
    setTemplateContent('');
    setSelectedTemplate(null);
    setIsEditing(false);
    
    showToast?.('success', 'Vorlage erfolgreich aktualisiert!');
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm('Möchten Sie diese Vorlage wirklich löschen?')) {
      const updatedTemplates = templates.filter(template => template.id !== id);
      setTemplates(updatedTemplates);
      localStorage.setItem('emailTemplates', JSON.stringify(updatedTemplates));
      
      if (selectedTemplate && selectedTemplate.id === id) {
        setSelectedTemplate(null);
      }
      
      showToast?.('success', 'Vorlage erfolgreich gelöscht!');
    }
  };

  const handleUseTemplate = (template: Template) => {
    // This would typically communicate with the GeneratorTab
    // For now, we'll just show the template content
    setSelectedTemplate(template);
  };

  const handleCancelEdit = () => {
    setTemplateName('');
    setTemplateContent('');
    setSelectedTemplate(null);
    setIsEditing(false);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('de-DE');
  };

  return (
    <div id="templatesTab" className="tab-content active">
      <div className="template-container">
        <div className="template-form">
          <h3>{isEditing ? 'Vorlage bearbeiten' : 'Neue Vorlage erstellen'}</h3>
          <div className="template-form-group">
            <label htmlFor="templateName">Vorlagenname</label>
            <input 
              type="text" 
              id="templateName" 
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Vorlagenname eingeben..." 
            />
          </div>
          <div className="template-form-group">
            <label htmlFor="templateContent">E-Mail Inhalt</label>
            <textarea 
              id="templateContent" 
              rows={8} 
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              placeholder="Vorlagetext eingeben oder aus einer generierten E-Mail kopieren..."
            />
          </div>
          <div className="template-form-actions">
            <button 
              className="cancel-btn"
              onClick={handleCancelEdit}
            >
              Abbrechen
            </button>
            <button 
              className="save-btn"
              onClick={isEditing ? handleUpdateTemplate : handleSaveTemplate}
            >
              {isEditing ? 'Aktualisieren' : 'Speichern'}
            </button>
          </div>
        </div>

        <div id="templateList">
          {templates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📄</div>
              <p>Noch keine Vorlagen erstellt</p>
              <small>Erstellen Sie Ihre ersten E-Mail Vorlagen</small>
            </div>
          ) : (
            <div className="templates-grid">
              {templates.map((template) => (
                <div key={template.id} className={`template-card ${isEditing ? 'disabled' : ''} ${isEditing && selectedTemplate?.id === template.id ? 'editing' : ''}`}>
                  <div className="template-card-header">
                    <h4>{template.name}</h4>
                    <div className="template-card-actions">
                      <button 
                        className="action-btn use-btn"
                        onClick={() => handleUseTemplate(template)}
                        title="Verwenden"
                        disabled={isEditing}
                      >
                        📧
                      </button>
                      <button 
                        className="action-btn edit-btn"
                        onClick={() => handleEditTemplate(template)}
                        title="Bearbeiten"
                        disabled={isEditing}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteTemplate(template.id)}
                        title="Löschen"
                        disabled={isEditing}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="template-card-content">
                    {template.content.length > 150 
                      ? template.content.substring(0, 150) + '...' 
                      : template.content
                    }
                  </div>
                  <div className="template-card-meta">
                    <span className="template-card-date">Erstellt: {formatDate(template.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedTemplate && !isEditing && (
          <div 
            className="template-detail"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedTemplate(null);
              }
            }}
          >
            <div className="template-detail-content">
              <div className="template-detail-header">
                <h3>Vorlage: {selectedTemplate.name}</h3>
                <button 
                  className="close-detail"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="template-detail-body">
                {selectedTemplate.content}
              </div>
              <div className="template-detail-actions">
                <button 
                  className="action-btn use-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedTemplate.content);
                    showToast?.('success', 'Vorlage in die Zwischenablage kopiert!');
                    setSelectedTemplate(null);
                  }}
                >
                  <Copy className="h-4 w-4" />
                  <span>Kopieren</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
