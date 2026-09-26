import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

vi.mock('../../../contexts/SeasonalContext', () => ({
  useSeason: () => ({
    colors: { border: 'border-x', hover: 'hover-x', primaryText: 'text-x', secondaryText: 'text-y' },
  }),
}));

import PomodoroTimer from '../PomodoroTimer';
import { STORAGE_KEY } from '../focusTimer';

const clock = () => screen.getByRole('button', { name: /\d:\d\d|\d\d:\d\d/ }).textContent;
const openEditor = () => fireEvent.click(screen.getByRole('button', { name: /Click to change the focus length/ }));

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('focus timer: choosing the length', () => {
  it('starts at 25 minutes', () => {
    render(<PomodoroTimer />);
    expect(clock()).toBe('25:00');
    expect(screen.getByText('Focus · 25 min')).toBeTruthy();
  });

  it('lets the user type their own length', () => {
    render(<PomodoroTimer />);
    openEditor();
    fireEvent.change(screen.getByLabelText('Focus length in minutes'), { target: { value: '90' } });
    fireEvent.keyDown(screen.getByLabelText('Focus length in minutes'), { key: 'Enter' });
    expect(clock()).toBe('1:30:00');
    expect(screen.getByText('Focus · 90 min')).toBeTruthy();
    expect(screen.queryByLabelText('Focus length in minutes')).toBeNull();
  });

  it('offers 60, 80, 90 and 100 as one-tap choices', () => {
    render(<PomodoroTimer />);
    openEditor();
    const group = screen.getByRole('group', { name: 'Common focus lengths' });
    for (const m of ['60', '80', '90', '100']) expect(group.textContent).toContain(m);
    fireEvent.click(screen.getByRole('button', { name: '100' }));
    expect(clock()).toBe('1:40:00');
  });

  it('rejects an unusable length and leaves the timer alone', () => {
    render(<PomodoroTimer />);
    openEditor();
    fireEvent.change(screen.getByLabelText('Focus length in minutes'), { target: { value: '0' } });
    fireEvent.keyDown(screen.getByLabelText('Focus length in minutes'), { key: 'Enter' });
    expect(screen.getByRole('alert').textContent).toMatch(/1 to 600 minutes/);
    expect(clock()).toBe('25:00');
  });

  it('Escape closes the editor without changing anything', () => {
    render(<PomodoroTimer />);
    openEditor();
    fireEvent.keyDown(screen.getByLabelText('Focus length in minutes'), { key: 'Escape' });
    expect(screen.queryByLabelText('Focus length in minutes')).toBeNull();
    expect(clock()).toBe('25:00');
  });

  it('cannot be changed while the timer is running, and Reset goes back to the chosen length', () => {
    render(<PomodoroTimer />);
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: '60' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect((screen.getByRole('button', { name: /^\d/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(clock()).toBe('1:00:00');
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });
});

describe('focus timer: survives closing the panel (the note editor unmounts it)', () => {
  it('remembers the chosen length', () => {
    const first = render(<PomodoroTimer />);
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: '80' }));
    first.unmount();
    render(<PomodoroTimer />);
    expect(clock()).toBe('1:20:00');
  });

  it('keeps counting down while it is closed, and comes back running', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
    const first = render(<PomodoroTimer />);
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: '60' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    first.unmount();

    vi.setSystemTime(new Date('2026-09-26T10:20:00Z')); // 20 minutes pass with the panel closed
    render(<PomodoroTimer />);
    expect(clock()).toBe('40:00');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('pausing keeps the exact time left, also after a reopen', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
    const first = render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => { vi.advanceTimersByTime(600); vi.setSystemTime(new Date('2026-09-26T10:05:00Z')); });
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(clock()).toBe('20:00');
    first.unmount();
    vi.setSystemTime(new Date('2026-09-26T11:00:00Z')); // an hour later: paused time must not move
    render(<PomodoroTimer />);
    expect(clock()).toBe('20:00');
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('a session that ended while closed reopens as the break, stopped', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
    const first = render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    first.unmount();
    vi.setSystemTime(new Date('2026-09-26T12:00:00Z'));
    render(<PomodoroTimer />);
    expect(clock()).toBe('05:00');
    expect(screen.getByText('Break · 5 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('starts fresh if the saved data is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    render(<PomodoroTimer />);
    expect(clock()).toBe('25:00');
  });
});

describe('focus timer: finishing', () => {
  it('a finished focus session becomes the break and stops', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-26T10:00:00Z'));
    render(<PomodoroTimer />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    act(() => { vi.setSystemTime(new Date('2026-09-26T10:25:01Z')); vi.advanceTimersByTime(600); });
    expect(clock()).toBe('05:00');
    expect(screen.getByText('Break · 5 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });
});
