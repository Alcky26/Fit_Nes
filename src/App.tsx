import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { DailyStatsPage } from './pages/DailyStatsPage'
import { ExerciseFormPage } from './pages/ExerciseFormPage'
import { ExerciseProgressPage } from './pages/ExerciseProgressPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LogEntryPage } from './pages/LogEntryPage'
import { MonthlyStatsPage } from './pages/MonthlyStatsPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { SessionEntryFormPage } from './pages/SessionEntryFormPage'
import { SettingsPage } from './pages/SettingsPage'
import { WeeklyStatsPage } from './pages/WeeklyStatsPage'
import { YearlyStatsPage } from './pages/YearlyStatsPage'
import { trashRepository } from './repositories'
import { ToastProvider } from './state/ToastContext'
import { useSystemTheme } from './state/useSystemTheme'

export default function App() {
  useSystemTheme()

  // Opportunistic sweep of expired undo-toast records — there's no
  // background timer since the app may not be open when they expire.
  useEffect(() => {
    trashRepository.clearExpired()
  }, [])

  return (
    <HashRouter>
      <ToastProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/exercises/new" element={<ExerciseFormPage />} />
            <Route path="/exercises/:id/edit" element={<ExerciseFormPage />} />
            <Route path="/exercises/:id/progress" element={<ExerciseProgressPage />} />
            <Route path="/log" element={<LogEntryPage />} />
            <Route path="/workouts/:id" element={<SessionDetailPage />} />
            <Route path="/workouts/:sessionId/entries/new" element={<SessionEntryFormPage />} />
            <Route path="/workouts/:sessionId/entries/:entryId/edit" element={<SessionEntryFormPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/today" element={<DailyStatsPage />} />
            <Route path="/stats/daily/:date" element={<DailyStatsPage />} />
            <Route path="/stats/weekly" element={<WeeklyStatsPage />} />
            <Route path="/stats/weekly/:date" element={<WeeklyStatsPage />} />
            <Route path="/stats/monthly" element={<MonthlyStatsPage />} />
            <Route path="/stats/monthly/:year/:month" element={<MonthlyStatsPage />} />
            <Route path="/stats/yearly" element={<YearlyStatsPage />} />
            <Route path="/stats/yearly/:year" element={<YearlyStatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppShell>
      </ToastProvider>
    </HashRouter>
  )
}
