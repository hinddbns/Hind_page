import { site } from "@/lib/site";

const COLORS = {
  cream: "#fbf6f0",
  ink: "#1c1715",
  inkSoft: "#3f3732",
  primary: "#b5654a",
  primaryLight: "#e7cabb",
  white: "#ffffff",
};

const FONT_STACK = "'Tajawal', Tahoma, Arial, sans-serif";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Shared branded shell every transactional email renders inside — table-based
 * and inline-styled, since email clients don't reliably support external/`<style>` CSS. */
function renderLayout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${COLORS.cream}; font-family:${FONT_STACK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.cream};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:${COLORS.white}; border-radius:16px;">
            <tr>
              <td style="padding:28px 32px 4px; text-align:center; border-bottom:1px solid ${COLORS.primaryLight};">
                <span style="font-size:18px; font-weight:700; color:${COLORS.primary}; padding-bottom:24px; display:inline-block;">${escapeHtml(site.name)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 32px; color:${COLORS.ink}; font-size:15px; line-height:1.9; text-align:right;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export type EmailContent = { subject: string; html: string; text: string };

export function enrollmentApprovedEmail({ name, courseTitle }: { name: string; courseTitle: string }): EmailContent {
  const subject = `تم تفعيل وصولك إلى دورة "${courseTitle}"`;
  const safeName = escapeHtml(name);
  const safeCourseTitle = escapeHtml(courseTitle);

  const bodyHtml = `
    <p style="margin:0 0 16px;">مرحبًا ${safeName}،</p>
    <p style="margin:0;">تمت الموافقة على طلب اشتراكك في دورة «${safeCourseTitle}»، ويمكنك الآن الوصول إلى محتواها من مساحتك الشخصية.</p>
  `;

  const text = `مرحبًا ${name}،\n\nتمت الموافقة على طلبك، ويمكنك الآن الوصول إلى محتوى الدورة من مساحتك الشخصية.`;

  return { subject, html: renderLayout(subject, bodyHtml), text };
}

export function enrollmentRejectedEmail({ name, courseTitle }: { name: string; courseTitle: string }): EmailContent {
  const subject = `بخصوص طلب الاشتراك في دورة "${courseTitle}"`;
  const safeName = escapeHtml(name);
  const safeCourseTitle = escapeHtml(courseTitle);

  const bodyHtml = `
    <p style="margin:0 0 16px;">مرحبًا ${safeName}،</p>
    <p style="margin:0;">للأسف تعذّر تفعيل وصولك إلى دورة «${safeCourseTitle}» حاليًا. يمكنك مراجعة إيصال الدفع وإعادة المحاولة من مساحتك الشخصية.</p>
  `;

  const text = `مرحبًا ${name}،\n\nللأسف تعذّر تفعيل وصولك إلى هذه الدورة حاليًا. يمكنك مراجعة إيصال الدفع وإعادة المحاولة من مساحتك الشخصية.`;

  return { subject, html: renderLayout(subject, bodyHtml), text };
}
