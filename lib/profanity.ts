// Deliberately small word filter (TZ §16). Matches whole words, case-insensitive, with basic leetspeak folding.
const WORDS = [
  "fuck", "fucking", "fucker", "shit", "bitch", "cunt", "asshole", "dick", "pussy", "cock",
  "nigger", "nigga", "faggot", "fag", "retard", "whore", "slut", "rape", "porn", "nazi",
];

const pattern = new RegExp(`\\b(${WORDS.join("|")})\\b`, "i");

function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t");
}

export function hasProfanity(...texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => !!t && (pattern.test(t) || pattern.test(fold(t))));
}
