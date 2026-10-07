/**
 * Telegram Notification Service for YorBuddy
 * 
 * Sends notifications to a Telegram chat when Facebook posts are published.
 * 
 * Environment variables:
 *   TELEGRAM_BOT_TOKEN - Bot token from @BotFather
 *   TELEGRAM_CHAT_ID - Target chat/channel ID (e.g., -1001234567890)
 */

import path from 'node:path';

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    date: number;
    chat: { id: number; type: string };
  };
  description?: string;
  error_code?: number;
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  text: string,
  chatId: string = process.env.TELEGRAM_CHAT_ID || '',
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  }

  if (!chatId) {
    return { success: false, error: 'TELEGRAM_CHAT_ID is not set' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload: TelegramMessage = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: false,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as TelegramResponse;

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Telegram API error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Format a Facebook post notification message
 */
export function formatFacebookPostNotification(params: {
  postId: string;
  topic: string;
  category: string;
  createdAt?: string;
  imagePath?: string;
}): string {
  const { postId, topic, category, createdAt } = params;

  const lines = [
    '📱 <b>YorBuddy Facebook Post Published</b>',
    '',
    `📌 <b>Topic:</b> ${topic}`,
    `📂 <b>Category:</b> ${category}`,
    `🔗 <b>Post ID:</b> <code>${postId}</code>`,
  ];

  if (createdAt) {
    lines.push(`🕐 <b>Created:</b> ${createdAt}`);
  }

  lines.push('');
  lines.push('✅ <i>Post verified and live on Facebook.</i>');

  return lines.join('\n');
}

/**
 * Send a Facebook post notification
 */
export async function sendFacebookPostPublishedNotification(params: {
  postId: string;
  topic: string;
  category: string;
  createdAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  const text = formatFacebookPostNotification(params);
  return sendTelegramMessage(text);
}

/**
 * Verify the Telegram bot is working
 */
export interface TelegramBotResponse {
  ok: boolean;
  result?: {
    id: number;
    first_name: string;
    username: string;
  };
  description?: string;
}

export async function verifyTelegramBot(): Promise<{
  success: boolean;
  botInfo?: { id: number; first_name: string; username: string };
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  }

  const url = `https://api.telegram.org/bot${token}/getMe`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as TelegramBotResponse;

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      botInfo: data.result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Telegram API error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Get the configured chat ID
 */
export function getTelegramChatId(): string {
  return process.env.TELEGRAM_CHAT_ID || '';
}

/**
 * Answer a callback query (acknowledge button press)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  }

  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;

  const payload: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
  };

  if (text) {
    payload.text = text;
    payload.show_alert = showAlert;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { ok: boolean; description?: string; };

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Telegram API error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Send a photo with inline keyboard buttons
 */
export async function sendPhotoWithKeyboard(
  photoPath: string,
  caption: string,
  inlineKeyboard: Array<Array<{ text: string; callback_data: string }>>,
  chatId: string = process.env.TELEGRAM_CHAT_ID || ''
): Promise<{
  success: boolean;
  messageId?: number;
  photoUploaded?: boolean;
  captionPresent?: boolean;
  approvalButtonsPresent?: boolean;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  }

  if (!chatId) {
    return { success: false, error: 'TELEGRAM_CHAT_ID is not set' };
  }

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;

  // Build multipart form data
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');
  formData.append(
    'reply_markup',
    JSON.stringify({ inline_keyboard: inlineKeyboard })
  );

  try {
    const fs = await import('fs/promises');
    const resolvedPhotoPath = path.resolve(photoPath);
    const imageBuffer = await fs.readFile(resolvedPhotoPath);

    if (imageBuffer.length === 0) {
      return { success: false, error: 'Generated preview image is empty' };
    }

    const isPng = imageBuffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    if (!isPng) {
      return { success: false, error: 'Generated preview image is not a PNG' };
    }

    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('photo', blob, path.basename(resolvedPhotoPath));

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: {
        message_id: number;
        photo?: unknown[];
        caption?: string;
        reply_markup?: { inline_keyboard?: Array<Array<{ text: string; callback_data: string }>> };
      };
      description?: string;
    };

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    const sentMessage = data.result;
    const sentKeyboard = sentMessage?.reply_markup?.inline_keyboard || [];
    const expectedButtons = inlineKeyboard.flat();
    const approvalButtonsPresent = expectedButtons.every((expected) =>
      sentKeyboard.flat().some(
        (actual) =>
          actual.text === expected.text && actual.callback_data === expected.callback_data
      )
    );

    return {
      success: true,
      messageId: sentMessage?.message_id,
      photoUploaded: Boolean(sentMessage?.photo?.length),
      captionPresent: typeof sentMessage?.caption === 'string' && sentMessage.caption.length > 0,
      approvalButtonsPresent,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Telegram API error: ${err.message || 'Unknown error'}`,
    };
  }
}

/**
 * Edit a message's inline keyboard (remove buttons after action)
 */
export async function editMessageReplyMarkup(
  messageId: number,
  chatId: string = process.env.TELEGRAM_CHAT_ID || '',
  inlineKeyboard?: Array<Array<{ text: string; callback_data: string }>>
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  }

  if (!chatId) {
    return { success: false, error: 'TELEGRAM_CHAT_ID is not set' };
  }

  const url = `https://api.telegram.org/bot${token}/editMessageReplyMarkup`;

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
  };

  if (inlineKeyboard) {
    payload.reply_markup = JSON.stringify({ inline_keyboard: inlineKeyboard });
  } else {
    payload.reply_markup = JSON.stringify({ inline_keyboard: [] });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { ok: boolean; description?: string; };

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `Telegram API error: ${err.message || 'Unknown error'}`,
    };
  }
}

export const telegramService = {
  sendTelegramMessage,
  sendFacebookPostPublishedNotification,
  verifyTelegramBot,
  getTelegramChatId,
  formatFacebookPostNotification,
  answerCallbackQuery,
  sendPhotoWithKeyboard,
  editMessageReplyMarkup,
};
