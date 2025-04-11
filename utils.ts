import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function generateTimeSlots(
  startTime: Date,
  endTime: Date,
  durationMinutes: number,
  bufferMinutes: number = 0
): { start: Date; end: Date }[] {
  const slots = [];
  let currentStart = new Date(startTime);

  while (currentStart.getTime() + durationMinutes * 60000 <= endTime.getTime()) {
    const slotEnd = new Date(currentStart.getTime() + durationMinutes * 60000);
    slots.push({
      start: new Date(currentStart),
      end: new Date(slotEnd),
    });
    
    // Add buffer time
    currentStart = new Date(slotEnd.getTime() + bufferMinutes * 60000);
  }

  return slots;
}
