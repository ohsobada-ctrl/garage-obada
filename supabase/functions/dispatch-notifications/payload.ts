// Keep multibyte Arabic/emoji payloads below APNs/Web Push size limits.
// The full message remains in the durable inbox.
export function pushPreview(message: { id: string; title: string; body: string }) {
  const shorten = (text: string, limit: number) => {
    const chars = Array.from(text);
    return chars.length > limit ? chars.slice(0, limit - 1).join('') + '…' : text;
  };
  return { id: message.id, title: shorten(message.title, 100), body: shorten(message.body, 350) };
}
