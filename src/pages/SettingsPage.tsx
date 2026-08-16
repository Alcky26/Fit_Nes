import { useEffect, useRef, useState } from 'react'
import type { BackupData } from '../backup/types'
import { clearAllData } from '../backup/clearAllData'
import { downloadBackup } from '../backup/exportBackup'
import { downloadHistoryCsv } from '../backup/exportCsv'
import { importBackup, type ImportMode } from '../backup/importBackup'
import { validateBackup, type BackupSummary } from '../backup/validateBackup'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { useInstallPrompt } from '../pwa/useInstallPrompt'
import { settingsRepository } from '../repositories'
import { applyTheme } from '../state/theme'
import type { AppSettings, ThemeMode } from '../types'
import { formatBytes } from '../utils/format'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const { canInstall, installed, promptInstall } = useInstallPrompt()

  const [exportingJson, setExportingJson] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<{ data: BackupData; summary: BackupSummary } | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('merge')
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const [confirmClearOpen, setConfirmClearOpen] = useState(false)

  useEffect(() => {
    settingsRepository.get().then(setSettings)
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 })
      })
    }
  }, [])

  async function handleThemeChange(mode: ThemeMode) {
    const updated = await settingsRepository.update({ theme: mode })
    applyTheme(mode)
    setSettings(updated)
  }

  async function handleExportJson() {
    setExportingJson(true)
    try {
      await downloadBackup()
    } finally {
      setExportingJson(false)
    }
  }

  async function handleExportCsv() {
    setExportingCsv(true)
    try {
      await downloadHistoryCsv()
    } finally {
      setExportingCsv(false)
    }
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return
    setImportError(null)
    setImportMessage(null)
    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      const result = validateBackup(parsed)
      if (!result.valid || !result.data || !result.summary) {
        const shown = result.errors.slice(0, 3).join('; ')
        setImportError(`This file couldn't be imported: ${shown}${result.errors.length > 3 ? '…' : ''}`)
        return
      }
      setImportMode('merge')
      setPendingImport({ data: result.data, summary: result.summary })
    } catch {
      setImportError('This file is not valid JSON — it may be corrupted.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return
    setImporting(true)
    try {
      const result = await importBackup(pendingImport.data, importMode)
      setImportMessage(
        `Imported ${result.exercisesImported} exercise${result.exercisesImported === 1 ? '' : 's'}, ` +
          `${result.sessionsImported} workout${result.sessionsImported === 1 ? '' : 's'}, ` +
          `${result.entriesImported} entr${result.entriesImported === 1 ? 'y' : 'ies'}, ` +
          `${result.photosImported} photo${result.photosImported === 1 ? '' : 's'}.`,
      )
      setPendingImport(null)
    } catch {
      setImportError('Something went wrong partway through the import. Restore from a recent backup if data looks wrong.')
    } finally {
      setImporting(false)
    }
  }

  async function handleClearAllData() {
    setConfirmClearOpen(false)
    await clearAllData()
    window.location.hash = '/'
    window.location.reload()
  }

  return (
    <div className="page">
      <header className="page__header">
        <h1>Settings</h1>
      </header>

      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-section__options">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`chip${settings?.theme === opt.value ? ' chip--active' : ''}`}
              onClick={() => handleThemeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Units</h2>
        <p className="field__hint">
          Metric (kg, km, km/h, min) — the only system supported right now. The units field on every stat is
          designed so imperial can be added later without a data migration.
        </p>
      </section>

      <section className="settings-section">
        <h2>Data &amp; Backup</h2>
        <p className="field__hint">
          Your fitness data stays on this device. Nothing is ever sent anywhere except through backups you export
          yourself.
        </p>

        <button type="button" className="btn btn--primary" disabled={exportingJson} onClick={handleExportJson}>
          {exportingJson ? 'Exporting…' : 'Export Full Backup (JSON)'}
        </button>

        <label className="btn photo-field__picker">
          Import Backup
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => handleFileSelected(e.target.files?.[0])}
          />
        </label>

        {importError && <p className="field__hint field__hint--error">{importError}</p>}
        {importMessage && <p className="field__hint">{importMessage}</p>}

        {pendingImport && (
          <div className="import-preview">
            <h3>Import Preview</h3>
            <p>
              {pendingImport.summary.exerciseCount} exercises, {pendingImport.summary.sessionCount} workouts,{' '}
              {pendingImport.summary.entryCount} entries, {pendingImport.summary.photoCount} photos.
            </p>
            <div className="settings-section__options">
              <button
                type="button"
                className={`chip${importMode === 'merge' ? ' chip--active' : ''}`}
                onClick={() => setImportMode('merge')}
              >
                Merge
              </button>
              <button
                type="button"
                className={`chip${importMode === 'replace' ? ' chip--active' : ''}`}
                onClick={() => setImportMode('replace')}
              >
                Replace Everything
              </button>
            </div>
            <p className="field__hint">
              {importMode === 'merge'
                ? 'Adds new items and overwrites any existing item with the same id. Nothing else is removed.'
                : 'Deletes everything currently on this device first, then imports. This cannot be undone.'}
            </p>
            <div className="inline-form__actions">
              <button type="button" className="btn" onClick={() => setPendingImport(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn--primary${importMode === 'replace' ? ' btn--danger' : ''}`}
                disabled={importing}
                onClick={handleConfirmImport}
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        )}

        <button type="button" className="btn" disabled={exportingCsv} onClick={handleExportCsv}>
          {exportingCsv ? 'Exporting…' : 'Export History (CSV)'}
        </button>
      </section>

      <section className="settings-section">
        <h2>PWA Installation</h2>
        {installed ? (
          <p className="field__hint">Installed — you're using the installed app right now.</p>
        ) : canInstall ? (
          <>
            <p className="field__hint">
              Install Fitness Tracker for a full-screen, app-like experience and offline access — recording a
              workout never needs a connection once it's installed.
            </p>
            <button type="button" className="btn btn--primary" onClick={promptInstall}>
              Install App
            </button>
          </>
        ) : (
          <p className="field__hint">
            Your browser doesn't offer a one-tap install here. On iPhone/iPad (Safari): tap Share, then "Add to
            Home Screen". On desktop Chrome or Edge: look for an install icon in the address bar.
          </p>
        )}
      </section>

      {storage && (
        <section className="settings-section">
          <h2>Storage</h2>
          <p className="field__hint">
            {formatBytes(storage.usage)} used{storage.quota > 0 ? ` of ${formatBytes(storage.quota)} available` : ''}.
          </p>
        </section>
      )}

      <section className="danger-zone">
        <h2>Delete All Data</h2>
        <p>
          Permanently deletes every exercise, workout, and photo on this device. This cannot be undone — export a
          backup first if you want to keep a copy.
        </p>
        <button type="button" className="btn btn--danger" onClick={() => setConfirmClearOpen(true)}>
          Delete All Data
        </button>
      </section>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Delete all data?"
        description="This permanently deletes every exercise, workout, and photo on this device. This can't be undone."
        confirmLabel="Delete Everything"
        destructive
        onConfirm={handleClearAllData}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </div>
  )
}
