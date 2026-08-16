import { fireEvent, render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInstallPrompt } from './useInstallPrompt'

function TestComponent() {
  const { canInstall, installed, promptInstall } = useInstallPrompt()
  return (
    <div>
      <span data-testid="can-install">{String(canInstall)}</span>
      <span data-testid="installed">{String(installed)}</span>
      <button onClick={promptInstall}>Install</button>
    </div>
  )
}

type FakeInstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

describe('useInstallPrompt', () => {
  it('becomes installable after beforeinstallprompt fires, and calls prompt() when triggered', async () => {
    render(<TestComponent />)
    expect(screen.getByTestId('can-install').textContent).toBe('false')

    const promptSpy = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt', { cancelable: true }) as FakeInstallEvent
    event.prompt = promptSpy
    event.userChoice = Promise.resolve({ outcome: 'accepted' })

    await act(async () => {
      window.dispatchEvent(event)
    })
    expect(screen.getByTestId('can-install').textContent).toBe('true')

    await act(async () => {
      fireEvent.click(screen.getByText('Install'))
    })
    expect(promptSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('installed').textContent).toBe('true')
  })

  it('marks installed=true when the appinstalled event fires directly', async () => {
    render(<TestComponent />)
    await act(async () => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.getByTestId('installed').textContent).toBe('true')
  })
})
