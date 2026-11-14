// zod schemas shared by the client forms and the API (TZ §10).
import { z } from "zod";
import { ACTIVITIES, DURATIONS } from "./types";

const name = z.string().trim().min(1, "Please enter your first name").max(30, "Keep it under 30 characters");
const email = z.string().trim().toLowerCase().max(254).email("Please enter a valid email");
const photoPath = z
  .string()
  .regex(/^[0-9a-f-]{36}\.webp$/)
  .nullable()
  .default(null);
const is18 = z.literal(true, { message: "You need to be 18 or older" });

export const joinSchema = z.object({
  name,
  email,
  photoPath,
  is18,
});

export const createEventSchema = z
  .object({
    city: z.string().min(1).max(40),
    venueId: z.string().uuid().nullable().default(null),
    place: z
      .object({
        name: z.string().trim().min(2, "Name the place (2–60 characters)").max(60),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .nullable()
      .default(null),
    activity: z.enum(ACTIVITIES),
    activityOther: z.string().trim().max(40).nullable().default(null),
    title: z.string().trim().max(80).default(""),
    description: z.string().trim().max(280).default(""),
    startsAtLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time"),
    durationMinutes: z.union(DURATIONS.map((d) => z.literal(d)) as [z.ZodLiteral<60>, z.ZodLiteral<90>, z.ZodLiteral<120>, z.ZodLiteral<180>]),
    minPeople: z.number().int().min(3).max(12),
    maxPeople: z.number().int().max(20),
    host: z.object({ name, email, photoPath, is18 }),
    asVenue: z
      .object({ enabled: z.boolean(), email: email.nullable().default(null) })
      .default({ enabled: false, email: null }),
    /** Honored only for admins (TZ §8.9): team-created plans carry the Demo badge. */
    isDemo: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.maxPeople < v.minPeople) {
      ctx.addIssue({ code: "custom", path: ["maxPeople"], message: "Max can't be below the minimum" });
    }
    if (!v.venueId && !v.place) {
      ctx.addIssue({ code: "custom", path: ["place"], message: "Pick a place" });
    }
    if (v.activity === "other" && !v.activityOther) {
      ctx.addIssue({ code: "custom", path: ["activityOther"], message: "Say what you're doing" });
    }
    if (v.asVenue.enabled && (!v.venueId || !v.asVenue.email)) {
      ctx.addIssue({ code: "custom", path: ["asVenue"], message: "Pick a listed venue and add a work email" });
    }
  });

export type CreateEventParsed = z.infer<typeof createEventSchema>;
export type JoinParsed = z.infer<typeof joinSchema>;

export function defaultMax(min: number): number {
  return Math.min(2 * min, 20);
}
