import React from 'react';
import { AlertTriangle, ShieldCheck, FileText, Trash2, X, Check } from 'lucide-react';
import { ProposedAction } from '../types/agent';

interface ConfirmationModalProps {
  action: ProposedAction | null;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  action,
  isOpen,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen || !action) return null;

  const isDelete = action.action === 'delete_file';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/80 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden">
        {/* Warning Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border-b border-amber-500/30 px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              Security & Guardrails Guard
            </span>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Critical Action Confirmation Required
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="ml-auto text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="text-slate-300 text-sm leading-relaxed">
            The AI Agent is requesting authorization to perform a critical storage operation.
            As requested by system policy, human authorization is mandatory before modifying disk or persistent data.
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
              <span className="font-medium text-slate-300">Action Type:</span>
              <span className={`px-2 py-0.5 rounded font-mono font-medium ${isDelete ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                {isDelete ? 'PERMANENT DELETE' : 'WRITE & SAVE FILE'}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 mt-0.5">
                {isDelete ? <Trash2 className="w-5 h-5 text-rose-400" /> : <FileText className="w-5 h-5 text-indigo-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {action.filename}
                </p>
                <p className="text-xs text-slate-400">
                  Size: {((action.sizeBytes || 0) / 1024).toFixed(2)} KB • Format: .{action.format} • Category: {action.type}
                </p>
              </div>
            </div>

            {action.preview && (
              <div className="mt-2">
                <span className="text-xs text-slate-400 block mb-1">Preview Snippet:</span>
                <div className="bg-slate-900 border border-slate-800 rounded p-2.5 text-xs text-slate-300 font-mono max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {action.preview}
                </div>
              </div>
            )}
          </div>

          {/* Explicit User Question */}
          <div className="text-center pt-2">
            <p className="text-base font-semibold text-amber-200">
              Do you want to proceed?
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Selecting "Yes" authorizes the action. Selecting "No" immediately halts the operation.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-slate-950/90 border-t border-slate-800 px-6 py-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-600"
          >
            No, Cancel Action
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition focus:outline-none focus:ring-2 disabled:opacity-50 ${
              isDelete
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 focus:ring-rose-500'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/40 focus:ring-emerald-500'
            }`}
          >
            {isProcessing ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Yes, Proceed & Authorize
          </button>
        </div>
      </div>
    </div>
  );
};
