'use client';

import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const handleModalBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
      }}
      onClick={handleModalBackdropClick}
    >
      <div
        className="relative w-full"
        style={{
          maxWidth: "500px",
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))",
          padding: "2px",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          animation: "fadeIn 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: "var(--main-bg)",
            backdropFilter: "blur(20px)",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center justify-between p-6 border-b"
            style={{ borderColor: "var(--border-color)" }}
          >
            <h3
              className="text-xl font-bold flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              <AlertCircle className="h-5 w-5" style={{ color: "#ef4444" }} />
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg transition-all duration-200"
              style={{
                color: "var(--text-secondary)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--section-bg)"
                e.currentTarget.style.color = "var(--text-primary)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.color = "var(--text-secondary)"
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <p
              className="mb-6 leading-relaxed"
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.9375rem",
                lineHeight: "1.6",
              }}
            >
              {message}
            </p>

            <div
              className="flex items-center justify-end gap-3 pt-4"
              style={{ borderTop: "1px solid var(--border-color)" }}
            >
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--section-bg)"
                  e.currentTarget.style.transform = "translateY(-1px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--input-bg)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)"
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "none"
                }}
              >
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

