'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, ChevronDown, Loader2 } from 'lucide-react';
import { getISTToday } from '@/lib/utils/date';

function getMonthRange(offsetMonths: number): { from: string; to: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1 + offsetMonths; // may be 0 or negative

  // Normalise to a real calendar month
  const date = new Date(y, m - 1, 1);
  const year  = date.getFullYear();
  const month = date.getMonth() + 1;

  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return { from, to, label };
}

export function ReportDownload() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'this' | 'last' | 'custom'>('last');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const thisMonth = getMonthRange(0);
  const lastMonth = getMonthRange(-1);
  const today = getISTToday();

  const selectedRange =
    mode === 'this'   ? thisMonth :
    mode === 'last'   ? lastMonth :
    { from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` };

  const canDownload =
    mode !== 'custom' ||
    (customFrom && customTo && customFrom <= customTo);

  const handleDownload = async () => {
    if (!canDownload) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/expenses/report?from=${selectedRange.from}&to=${selectedRange.to}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to generate report');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `expenses-${selectedRange.from}-to-${selectedRange.to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4" style={{ color: 'var(--accent-secondary)' }} />
          <span className="text-sm font-semibold">Download Report</span>
        </div>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{
            color: 'var(--foreground-subtle)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: '1px solid var(--glass-border)' }}
            >
              {/* Quick selectors */}
              <div className="flex gap-2 pt-3">
                {(['last', 'this', 'custom'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 text-xs font-medium py-2 px-2 rounded-lg transition-all"
                    style={{
                      background: mode === m ? 'var(--accent-secondary)' : 'var(--glass-bg)',
                      color:      mode === m ? '#fff' : 'var(--foreground-secondary)',
                      border:     mode === m ? 'none' : '1px solid var(--glass-border)',
                    }}
                  >
                    {m === 'last' ? 'Last month' : m === 'this' ? 'This month' : 'Custom'}
                  </button>
                ))}
              </div>

              {/* Custom range inputs */}
              {mode === 'custom' && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                      From
                    </label>
                    <input
                      type="date"
                      value={customFrom}
                      max={today}
                      onChange={e => setCustomFrom(e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--foreground-muted)' }}>
                      To
                    </label>
                    <input
                      type="date"
                      value={customTo}
                      max={today}
                      onChange={e => setCustomTo(e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Range preview */}
              {mode !== 'custom' && (
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {selectedRange.label} ({selectedRange.from} → {selectedRange.to})
                </p>
              )}

              {error && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
              )}

              <button
                onClick={handleDownload}
                disabled={!canDownload || loading}
                className="btn-primary w-full"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><Download className="w-4 h-4" /> Download Excel</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
