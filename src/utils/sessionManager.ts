import { Session } from '@/types';

// Spain timezone offset from UTC (CET = UTC+1, CEST = UTC+2)
// FITUR 2026 is in January, so CET (UTC+1) applies
const SPAIN_TIMEZONE_OFFSET_HOURS = 1;

// Get current time in Spain
export function getSpainTime(date?: Date): Date {
  const now = date || new Date();
  // Get UTC time, then add Spain offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (SPAIN_TIMEZONE_OFFSET_HOURS * 3600000));
}

export interface TimeUntilNext {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

export function isWithinSession(session: Session, currentTime: Date): boolean {
  const { hours: startHours, minutes: startMinutes } = parseTime(session.startTime);
  const { hours: endHours, minutes: endMinutes } = parseTime(session.endTime);

  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();

  const currentTotalMinutes = currentHours * 60 + currentMinutes;
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;

  return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes < endTotalMinutes;
}

export function findCurrentSession(
  sessions: Session[],
  eventDay: 'saturday' | 'sunday' | null,
  currentTime: Date
): Session | null {
  if (!eventDay) return null;

  const daySessions = sessions.filter(s => s.day === eventDay);

  for (const session of daySessions) {
    if (isWithinSession(session, currentTime)) {
      return session;
    }
  }

  return null;
}

export function findNextSession(
  sessions: Session[],
  eventDay: 'saturday' | 'sunday' | null,
  currentTime: Date
): Session | null {
  if (!eventDay) return null;

  const daySessions = sessions.filter(s => s.day === eventDay);
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  // Find the next session that starts after current time
  for (const session of daySessions) {
    const { hours: startHours, minutes: startMinutes } = parseTime(session.startTime);
    const startTotalMinutes = startHours * 60 + startMinutes;

    if (startTotalMinutes > currentTotalMinutes) {
      return session;
    }
  }

  return null;
}

export function getTimeUntilSession(session: Session, currentTime: Date): TimeUntilNext {
  const { hours: startHours, minutes: startMinutes } = parseTime(session.startTime);

  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentSeconds = currentTime.getSeconds();

  const targetTotalSeconds = startHours * 3600 + startMinutes * 60;
  const currentTotalSeconds = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

  let diffSeconds = targetTotalSeconds - currentTotalSeconds;

  // If negative, session has passed (shouldn't happen if called correctly)
  if (diffSeconds < 0) {
    diffSeconds = 0;
  }

  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds: diffSeconds,
  };
}

export function formatTime(hours: number, minutes: number, seconds: number): string {
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
  }

  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
  }

  if (hours === 0) {
    parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);
  }

  return parts.join(' ');
}

export function getSessionScheduleText(
  sessions: Session[],
  eventDay: 'saturday' | 'sunday' | null
): string[] {
  if (!eventDay) return [];

  const daySessions = sessions.filter(s => s.day === eventDay);

  return daySessions.map(
    s => `${s.startTime} - ${s.endTime}`
  );
}

export function formatSessionTime(session: Session): string {
  return `${session.startTime} - ${session.endTime}`;
}
