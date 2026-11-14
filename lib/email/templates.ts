// Short, plain emails. Every one links to the plan (TZ §14).

export interface PlanInfo {
  title: string;
  when: string; // already formatted in the city's zone, e.g. "Thu, Nov 20 · 7:00 PM CT"
  where: string;
  url: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout(opts: { heading: string; lines: string[]; plan: PlanInfo; cta: string; leaveUrl?: string }) {
  const { heading, lines, plan, cta, leaveUrl } = opts;
  const html = `<!doctype html><html><body style="margin:0;background:#faf6f0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2a211b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;padding:28px" cellpadding="0" cellspacing="0">
<tr><td style="font-weight:800;font-size:18px;color:#d9480f;padding-bottom:20px">iFound</td></tr>
<tr><td style="font-size:24px;font-weight:800;line-height:1.25;padding-bottom:12px">${esc(heading)}</td></tr>
${lines.map((l) => `<tr><td style="font-size:16px;line-height:1.5;padding-bottom:8px">${esc(l)}</td></tr>`).join("")}
<tr><td style="padding:16px 0;border-top:1px solid #eee3d6;margin-top:8px">
<div style="font-size:17px;font-weight:700">${esc(plan.title)}</div>
<div style="font-size:15px;color:#5b4c40;padding-top:4px">${esc(plan.when)}</div>
<div style="font-size:15px;color:#5b4c40">${esc(plan.where)}</div>
</td></tr>
<tr><td style="padding:8px 0 4px"><a href="${esc(plan.url)}" style="display:inline-block;background:#d9480f;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">${esc(cta)}</a></td></tr>
${leaveUrl ? `<tr><td style="font-size:14px;color:#7a6a5c;padding-top:20px">Can't make it? <a href="${esc(leaveUrl)}" style="color:#7a6a5c">Leave this plan</a></td></tr>` : ""}
</table>
<div style="font-size:12px;color:#9a8a7c;padding-top:16px">You're getting this because you joined or started a plan on iFound.</div>
</td></tr></table></body></html>`;
  const text = [
    heading,
    "",
    ...lines,
    "",
    plan.title,
    plan.when,
    plan.where,
    "",
    `${cta}: ${plan.url}`,
    ...(leaveUrl ? ["", `Can't make it? ${leaveUrl}`] : []),
  ].join("\n");
  return { html, text };
}

export function hostCreated(p: PlanInfo & { needed: number; minPeople: number }) {
  return {
    subject: "Your plan is live — share it to fill it",
    ...layout({
      heading: "Your plan is live",
      lines: [
        `It happens only if at least ${p.minPeople} people are in — you count as the first.`,
        `Share the link: it needs ${p.needed} more.`,
      ],
      plan: p,
      cta: "Open your plan",
    }),
  };
}

export function venueHostCreated(p: PlanInfo & { minPeople: number }) {
  return {
    subject: "Your plan is live — share it to fill it",
    ...layout({
      heading: "Your plan is live",
      lines: [`It happens only if at least ${p.minPeople} people join. Share the link to fill it.`],
      plan: p,
      cta: "Open the plan",
    }),
  };
}

export function joinedFilling(p: PlanInfo & { count: number; minPeople: number; deadline: string; leaveUrl: string }) {
  const needed = Math.max(p.minPeople - p.count, 0);
  return {
    subject: `You're in — ${p.count} of ${p.minPeople} so far`,
    ...layout({
      heading: "You're in",
      lines: [
        `${p.count} of ${p.minPeople} are in — needs ${needed} more.`,
        `If it doesn't reach ${p.minPeople} by ${p.deadline}, it's called off and we'll let you know. Nobody shows up alone.`,
      ],
      plan: p,
      cta: "See the plan",
      leaveUrl: p.leaveUrl,
    }),
  };
}

export function confirmed(p: PlanInfo & { count: number; whenShort: string; leaveUrl: string }) {
  return {
    subject: `It's on! ${p.title}, ${p.whenShort}`,
    ...layout({
      heading: "It's on!",
      lines: [`${p.count} people are going. See you there.`, "The calendar invite is attached."],
      plan: p,
      cta: "See the plan",
      leaveUrl: p.leaveUrl,
    }),
  };
}

export function joinedConfirmed(p: PlanInfo & { count: number; leaveUrl: string }) {
  return {
    subject: "You're in — it's on!",
    ...layout({
      heading: "You're in — it's on!",
      lines: [`${p.count} people are going. The calendar invite is attached.`],
      plan: p,
      cta: "See the plan",
      leaveUrl: p.leaveUrl,
    }),
  };
}

export function cancelledUnfilled(p: PlanInfo) {
  return {
    subject: "Didn't fill — called off",
    ...layout({
      heading: "Didn't fill — called off",
      lines: ["Not enough people joined in time, so this plan is off. Nobody shows up alone.", "Want to try again? Start a new plan."],
      plan: p,
      cta: "See the plan",
    }),
  };
}

export function cancelledHost(p: PlanInfo) {
  return {
    subject: "The host called off this plan",
    ...layout({
      heading: "The host called off this plan",
      lines: ["This plan isn't happening anymore."],
      plan: p,
      cta: "See the plan",
    }),
  };
}
