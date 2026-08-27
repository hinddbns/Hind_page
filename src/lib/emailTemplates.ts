// Base URL used to build the CTA links in the two transactional enrollment
// emails. There is no site-URL config elsewhere in the repo; this is the
// confirmed production domain (see EMAIL_FROM / docs/ROADMAP.md).
const SITE_URL = "https://benyashind.com";

// Brand text shown in the email header and footer.
const BRAND = "منصة هند بنياس للكورسات";

const FONT_STACK = "Tahoma, Arial, 'Noto Sans Arabic', sans-serif";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailContent = { subject: string; html: string; text: string };

/** Shared branded shell both enrollment emails render inside — table-based and
 * inline-styled, since email clients don't reliably support external/`<style>`
 * CSS. Approved and rejected differ only in the badge, headings, the middle
 * block, the CTA label and the footer note, so they stay visually consistent
 * by sharing this renderer. */
function renderEnrollmentEmail({
  documentTitle,
  badgeSymbol,
  badgeBg,
  badgeColor,
  badgeFontSize,
  heading,
  greeting,
  introLine,
  courseTitle,
  middleHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}: {
  documentTitle: string;
  badgeSymbol: string;
  badgeBg: string;
  badgeColor: string;
  badgeFontSize: string;
  heading: string;
  greeting: string;
  introLine: string;
  courseTitle: string;
  middleHtml: string;
  ctaLabel: string;
  ctaUrl?: string;
  footerNote: string;
}) {
  const button = ctaUrl
    ? `
              <div style="text-align:center;margin:28px 0 10px;">
                <a href="${escapeHtml(ctaUrl)}"
                   style="display:inline-block;padding:13px 28px;background:#bd5f42;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:700;">
                  ${ctaLabel}
                </a>
              </div>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(documentTitle)}</title>
  </head>
  <body style="margin:0;padding:0;">
<div dir="rtl" lang="ar" style="margin:0;padding:0;background:#f8f4ef;font-family:${FONT_STACK};color:#302b28;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f4ef;padding:40px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #eadfd6;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 32px 22px;text-align:center;border-bottom:1px solid #eee4dc;">
              <div style="font-size:22px;font-weight:700;color:#bd5f42;">
                ${BRAND}
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 32px 32px;text-align:right;">

              <!-- Status indicator -->
              <div style="text-align:center;margin-bottom:22px;">
                <div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:50%;background:${badgeBg};color:${badgeColor};font-size:${badgeFontSize};">
                  ${badgeSymbol}
                </div>
              </div>

              <h1 style="margin:0 0 18px;text-align:center;font-size:24px;line-height:1.6;color:#302b28;">
                ${heading}
              </h1>

              <p style="margin:0 0 8px;font-size:16px;line-height:1.9;color:#5b514c;">
                ${greeting}
              </p>

              <p style="margin:0 0 8px;font-size:16px;line-height:1.9;color:#5b514c;">
                ${introLine}
              </p>

              <!-- Course -->
              <div style="margin:18px 0;padding:16px 18px;border-radius:10px;background:#fff8f4;border:1px solid #ead8ce;text-align:center;">
                <strong style="font-size:17px;color:#bd5f42;">
                  ${courseTitle}
                </strong>
              </div>
${middleHtml}${button}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 28px;background:#faf5f0;text-align:center;border-top:1px solid #eee4dc;">
              <div style="font-size:14px;font-weight:700;color:#bd5f42;">
                ${BRAND}
              </div>

              <div style="margin-top:8px;font-size:12px;line-height:1.8;color:#81756e;">
                ${footerNote}
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</div>
  </body>
</html>`;
}

export function enrollmentApprovedEmail({
  name,
  courseTitle,
  courseSlug,
}: {
  name: string;
  courseTitle: string;
  courseSlug?: string;
}): EmailContent {
  const subject = `تم تفعيل وصولك إلى دورة "${courseTitle}"`;
  const safeName = escapeHtml(name);
  const safeCourseTitle = escapeHtml(courseTitle);
  const ctaUrl = courseSlug ? `${SITE_URL}/tableau-de-bord/cours/${courseSlug}` : undefined;

  const middleHtml = `
              <!-- Access message -->
              <div style="margin:22px 0;padding:14px 16px;border-radius:10px;background:#f2f8f3;color:#4b6551;font-size:14px;line-height:1.9;text-align:center;">
                يمكنك الآن الوصول إلى محتوى دورتك من مساحتك الشخصية.
              </div>`;

  const html = renderEnrollmentEmail({
    documentTitle: subject,
    badgeSymbol: "✓",
    badgeBg: "#edf6ef",
    badgeColor: "#4d8b5d",
    badgeFontSize: "25px",
    heading: "تمت الموافقة على طلب اشتراكك",
    greeting: `مرحباً ${safeName}،`,
    introLine: "يسعدنا إبلاغك بأنه تمت الموافقة على طلب اشتراكك في الدورة:",
    courseTitle: safeCourseTitle,
    middleHtml,
    ctaLabel: "الدخول إلى دورتي",
    ctaUrl,
    footerNote: "إذا كان لديك أي سؤال أو تحتاج إلى مساعدة، لا تتردد في التواصل معنا.",
  });

  const text = `مرحباً ${name}،

تمت الموافقة على طلب اشتراكك في دورة «${courseTitle}»، ويمكنك الآن الوصول إلى محتواها من مساحتك الشخصية.${ctaUrl ? `\n\nرابط الدورة: ${ctaUrl}` : ""}`;

  return { subject, html, text };
}

export function enrollmentRejectedEmail({
  name,
  courseTitle,
  courseSlug,
}: {
  name: string;
  courseTitle: string;
  courseSlug?: string;
}): EmailContent {
  const subject = `بخصوص طلب الاشتراك في دورة "${courseTitle}"`;
  const safeName = escapeHtml(name);
  const safeCourseTitle = escapeHtml(courseTitle);
  const ctaUrl = courseSlug ? `${SITE_URL}/cours/${courseSlug}` : undefined;

  const middleHtml = `
              <p style="margin:22px 0 0;font-size:14px;line-height:1.9;color:#6d625c;">
                يمكنك مراجعة إيصال الدفع والتأكد من وضوحه وصحته، ثم إعادة رفعه إذا لزم الأمر.
              </p>`;

  const html = renderEnrollmentEmail({
    documentTitle: subject,
    badgeSymbol: "×",
    badgeBg: "#fff0ed",
    badgeColor: "#c85d43",
    badgeFontSize: "27px",
    heading: "لم تتم الموافقة على طلب اشتراكك",
    greeting: `مرحباً ${safeName}،`,
    introLine: "نأسف لإبلاغك بأنه لم تتم الموافقة على طلب اشتراكك في الدورة:",
    courseTitle: safeCourseTitle,
    middleHtml,
    ctaLabel: "مراجعة وإعادة رفع الإيصال",
    ctaUrl,
    footerNote: "إذا كانت لديك أي استفسارات أو تحتاج إلى مساعدة، فنحن هنا لدعمك.",
  });

  const text = `مرحباً ${name}،

نأسف لإبلاغك بأنه لم تتم الموافقة على طلب اشتراكك في دورة «${courseTitle}» حاليًا. يمكنك مراجعة إيصال الدفع والتأكد من وضوحه وصحته، ثم إعادة رفعه من صفحة الدورة.${ctaUrl ? `\n\nرابط الدورة: ${ctaUrl}` : ""}`;

  return { subject, html, text };
}
