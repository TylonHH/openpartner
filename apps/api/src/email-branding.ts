/** Apply tenant colors only to the explicitly marked parts of our templates. */
export function brandEmailHtml(html: string, brandColor: string | null): string {
  const input = brandColor?.trim() ?? '';
  // Match the portal: alpha is stripped so mail clients get an opaque accent.
  const accent = /^#[\da-f]{6}([\da-f]{2})?$/i.test(input) ? input.slice(0, 7)
    : /^#[\da-f]{3}$/i.test(input) ? `#${[...input.slice(1)].map((c) => c + c).join('')}`
    : '#2dd4bf';
  const rgb = [1, 3, 5].map((offset) => parseInt(accent.slice(offset, offset + 2), 16));
  const luminance = (channels: number[]) => channels.reduce((sum, channel, i) => {
    const s = channel / 255;
    return sum + [0.2126, 0.7152, 0.0722][i]! * (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
  }, 0);
  // Black or white always gives at least 4.5:1 contrast on an opaque accent.
  const ink = luminance(rgb) > 0.179 ? '#000000' : '#ffffff';
  // Links sit on white, so darken light brand colors until they are readable.
  let linkRgb = rgb;
  while (luminance(linkRgb) > 0.183) linkRgb = linkRgb.map((c) => Math.floor(c * 0.9));
  const link = `#${linkRgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  return html.replace(/data-op-email="(card|link|button)" style="([^"]*)"/g, (_match, part: string, style: string) => {
    const branded = part === 'card' ? `${style} border-top:4px solid ${accent};`
      : part === 'link' ? style.replace('color:#2dd4bf', `color:${link}`)
      : style.replace('background:#2dd4bf', `background:${accent}`).replace('color:#041115', `color:${ink}`);
    return `style="${branded}"`;
  });
}
