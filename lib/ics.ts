// .ics calendar file (TZ §14): DTSTART/DTEND in UTC with Z, UID = <event_id>@<domain>.
import { DateTime } from "luxon";

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function fold(line: string): string {
  // RFC 5545: lines longer than 75 octets are folded with CRLF + space.
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

const utc = (d: DateTime) => d.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");

export function buildIcs(e: {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location: string;
  url: string;
  domain: string;
  cancelled?: boolean;
}): string {
  const start = DateTime.fromISO(e.startsAt, { zone: "utc" });
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//iFound//Plans//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@${e.domain}`,
    `DTSTAMP:${utc(DateTime.utc())}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(start.plus({ minutes: e.durationMinutes }))}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(`Plan details: ${e.url}`)}`,
    `URL:${e.url}`,
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
