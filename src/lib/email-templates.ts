/** Shared HTML wrapper for all emails */
function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Beach VB League</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:20px 32px;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">Beach VB League</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e4e4e7;background:#f9fafb;">
              <p style="margin:0;font-size:12px;color:#71717a;">
                You're receiving this because you're a member of a Beach VB League organization.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500;">${text}</a>`;
}

function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#09090b;">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:12px 0;font-size:14px;color:#3f3f46;line-height:1.6;">${text}</p>`;
}

function detail(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#71717a;white-space:nowrap;padding-right:16px;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#09090b;font-weight:500;">${value}</td>
  </tr>`;
}

function detailTable(rows: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;">${rows}</table>`;
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface RegistrationConfirmationData {
  playerName: string;
  orgName: string;
  eventName: string;
  teamName: string;
  role: "CAPTAIN" | "PLAYER";
  eventUrl: string;
}

export function registrationConfirmationEmail(data: RegistrationConfirmationData) {
  const subject = `You're registered for ${data.eventName}`;
  const html = layout(`
    ${h1("Registration confirmed!")}
    ${p(`Hi ${data.playerName}, you're all set for <strong>${data.eventName}</strong>.`)}
    ${detailTable(
      detail("Organization", data.orgName) +
      detail("Event", data.eventName) +
      detail("Team", data.teamName) +
      detail("Role", data.role === "CAPTAIN" ? "Team Captain" : "Player")
    )}
    ${btn("View event", data.eventUrl)}
  `);
  const text = `Hi ${data.playerName},\n\nYou're registered for ${data.eventName} (${data.orgName}).\nTeam: ${data.teamName}\nRole: ${data.role === "CAPTAIN" ? "Team Captain" : "Player"}\n\nView event: ${data.eventUrl}`;
  return { subject, html, text };
}

export interface FreeAgentConfirmationData {
  playerName: string;
  orgName: string;
  eventName: string;
  eventUrl: string;
}

export function freeAgentConfirmationEmail(data: FreeAgentConfirmationData) {
  const subject = `You're signed up as a free agent for ${data.eventName}`;
  const html = layout(`
    ${h1("Free agent signup confirmed!")}
    ${p(`Hi ${data.playerName}, you've been added to the free agent pool for <strong>${data.eventName}</strong>.`)}
    ${p("The organizer will reach out to place you on a team. Keep an eye out for further communication.")}
    ${detailTable(
      detail("Organization", data.orgName) +
      detail("Event", data.eventName)
    )}
    ${btn("View event", data.eventUrl)}
  `);
  const text = `Hi ${data.playerName},\n\nYou're signed up as a free agent for ${data.eventName} (${data.orgName}).\n\nThe organizer will place you on a team. View event: ${data.eventUrl}`;
  return { subject, html, text };
}

export interface WelcomeToTeamData {
  playerName: string;
  orgName: string;
  eventName: string;
  teamName: string;
  addedByName: string;
  teamUrl: string;
}

export function welcomeToTeamEmail(data: WelcomeToTeamData) {
  const subject = `You've been added to ${data.teamName}`;
  const html = layout(`
    ${h1(`You're on ${data.teamName}!`)}
    ${p(`Hi ${data.playerName}, <strong>${data.addedByName}</strong> has added you to <strong>${data.teamName}</strong> for ${data.eventName}.`)}
    ${detailTable(
      detail("Organization", data.orgName) +
      detail("Event", data.eventName) +
      detail("Team", data.teamName)
    )}
    ${btn("View team", data.teamUrl)}
  `);
  const text = `Hi ${data.playerName},\n\n${data.addedByName} has added you to ${data.teamName} for ${data.eventName} (${data.orgName}).\n\nView team: ${data.teamUrl}`;
  return { subject, html, text };
}

export interface AnnouncementEmailData {
  playerName: string;
  orgName: string;
  eventName?: string;
  title: string;
  body: string;
  eventUrl?: string;
  orgUrl: string;
}

export function announcementEmail(data: AnnouncementEmailData) {
  const subject = data.eventName
    ? `[${data.eventName}] ${data.title}`
    : `[${data.orgName}] ${data.title}`;
  const html = layout(`
    ${h1(data.title)}
    ${data.eventName ? p(`<strong>${data.orgName}</strong> · ${data.eventName}`) : p(`<strong>${data.orgName}</strong>`)}
    <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;">
      <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.7;white-space:pre-line;">${data.body.replace(/\n/g, "<br/>")}</p>
    </div>
    ${btn("View", data.eventUrl ?? data.orgUrl)}
  `);
  const text = `${data.title}\n\n${data.orgName}${data.eventName ? ` · ${data.eventName}` : ""}\n\n${data.body}\n\n${data.eventUrl ?? data.orgUrl}`;
  return { subject, html, text };
}

export interface SchedulePublishedData {
  playerName: string;
  orgName: string;
  eventName: string;
  teamName: string;
  gameCount: number;
  scheduleUrl: string;
}

export function schedulePublishedEmail(data: SchedulePublishedData) {
  const subject = `Schedule published for ${data.eventName}`;
  const html = layout(`
    ${h1("Schedule is out!")}
    ${p(`The schedule for <strong>${data.eventName}</strong> has been published.`)}
    ${detailTable(
      detail("Organization", data.orgName) +
      detail("Event", data.eventName) +
      detail("Your team", data.teamName) +
      detail("Games scheduled", String(data.gameCount))
    )}
    ${btn("View schedule", data.scheduleUrl)}
  `);
  const text = `The schedule for ${data.eventName} (${data.orgName}) has been published.\nYour team: ${data.teamName}\nGames: ${data.gameCount}\n\nView schedule: ${data.scheduleUrl}`;
  return { subject, html, text };
}

export interface BracketPublishedData {
  playerName: string;
  orgName: string;
  eventName: string;
  teamName: string;
  scheduleUrl: string;
}

export function bracketPublishedEmail(data: BracketPublishedData) {
  const subject = `Bracket published for ${data.eventName}`;
  const html = layout(`
    ${h1("The bracket is set!")}
    ${p(`The bracket for <strong>${data.eventName}</strong> has been generated. Check the schedule to see your first matchup.`)}
    ${detailTable(
      detail("Organization", data.orgName) +
      detail("Event", data.eventName) +
      detail("Your team", data.teamName)
    )}
    ${btn("View bracket & schedule", data.scheduleUrl)}
  `);
  const text = `The bracket for ${data.eventName} (${data.orgName}) is set.\nYour team: ${data.teamName}\n\nView schedule: ${data.scheduleUrl}`;
  return { subject, html, text };
}
