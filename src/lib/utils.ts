import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeDispatchChatSelected(chatId: string | null) {
  let event;
  try {
    event = new CustomEvent("chat-selected", { detail: chatId });
  } catch (e) {
    event = document.createEvent("CustomEvent");
    event.initCustomEvent("chat-selected", true, true, chatId);
  }
  window.dispatchEvent(event);
}
