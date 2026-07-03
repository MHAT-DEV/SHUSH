import React, { useState } from "react";
import { X, ArrowLeft, Users, Bell, BellOff, Link as LinkIcon, LogOut } from "lucide-react";

export function CircleConfigModal({
  isOpen,
  onClose,
  circle,
  user,
  onLeave,
  onUpdateNotifications,
  onGenerateInvite
}: any) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md bg-[var(--theme-bg)] md:rounded-2xl border-0 md:border border-[var(--theme-border)] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="md:hidden text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-display font-bold text-[var(--theme-text-primary)] text-lg">
                ตั้งค่า {circle?.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="hidden md:block text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            ...
          </div>
        </div>
      </div>
    </>
  );
}
