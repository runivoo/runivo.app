import { SITE_URL } from '../config/site';

/**
 * The shared frame of every Runivo email (welcome, broadcasts): white card on soft grey, the amber hex
 * and the "runivo" wordmark at the top. Email apps don't render SVG or web fonts reliably, so it is
 * tables + inline styles + a PNG hex served by the site itself (public/email), with Outfit and system
 * fallbacks. Server only.
 */

/** Who broadcasts come from when BROADCAST_FROM and WAITLIST_FROM are not set. */
export const DEFAULT_FROM = 'Runivo <hello@runivo.in>';

export const EMAIL_FONT = "Outfit,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A thin divider row between blocks. */
export const EMAIL_RULE = '<tr><td class="px" style="padding:0 56px;"><div style="border-top:1px solid #E8E8E4;font-size:0;line-height:0;">&nbsp;</div></td></tr>';

/** The black pill button used in both emails. */
export const emailButton = (label: string, href: string): string =>
  `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#17181A;border-radius:999px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:15px 28px;font-size:16px;font-weight:500;color:#FFFFFF;text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;

/**
 * The whole document around `rows` (each a `<tr>` inside the 600px card). `topPadding` is the space above the
 * logo; `mobileCss` adds size tweaks for phones on top of the shared 28px side padding.
 */
export function emailDocument({ title, preheader, rows, topPadding = 48, mobileCss = '' }: {
  title: string; preheader?: string | null; rows: string; topPadding?: number; mobileCss?: string;
}): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500&display=swap" rel="stylesheet">
<style>@media (max-width:520px){.px{padding-left:28px!important;padding-right:28px!important}${mobileCss}}</style>
</head>
<body style="margin:0;padding:0;background:#EDEDE9;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EDEDE9;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EDEDE9;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:20px;font-family:${EMAIL_FONT};color:#17181A;">

<tr><td class="px" style="padding:${topPadding}px 56px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;"><img src="${SITE_URL}/email/runivo-hex.png" width="24" height="24" alt="" style="display:block;"></td>
    <td style="vertical-align:middle;padding-left:12px;font-size:20px;font-weight:300;letter-spacing:1px;color:#17181A;">runivo</td>
  </tr></table>
</td></tr>

${rows}

</table>
</td></tr>
</table>
</body></html>`;
}
