import { z } from "zod";
import { ACCESS_CODE_PATTERN } from "@/lib/access-code";

const collapse = (value: string) => value.trim().replace(/\s+/g, " ");

export const id = z.uuid({ message: "Invalid identifier." });
export const personName = z
  .string()
  .transform(collapse)
  .pipe(z.string().min(1, "Name is required.").max(80, "Keep names under 80 characters."));
export const label = (field: string, max = 60) =>
  z
    .string()
    .transform(collapse)
    .pipe(z.string().min(1, `${field} is required.`).max(max, `${field} must be ${max} characters or fewer.`));
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : null));
export const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
export const photoUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^https:\/\/[^\s]+$/i.test(value), "Photo URL must start with https://");
export const accessCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(ACCESS_CODE_PATTERN, "Enter the six-character club code.");
export const dateInput = z.iso.date("Pick a valid date.");

export const marksValue = z.coerce
  .number({ message: "Marks must be a number." })
  .int("Marks must be a whole number.")
  .min(-1000, "Marks must be between −1000 and 1000.")
  .max(1000, "Marks must be between −1000 and 1000.")
  .refine((value) => value !== 0, "Marks can't be zero.");

export const awardMarksSchema = z.object({
  clubId: id,
  memberIds: z.array(id).min(1, "Pick at least one member.").max(200, "You can award up to 200 members at once."),
  marks: marksValue,
  reason: optionalText(200),
  seasonId: id.optional(),
});

export const updateEntrySchema = z.object({ clubId: id, entryId: id, marks: marksValue, reason: optionalText(200) });

export const memberSchema = z.object({
  clubId: id,
  name: personName,
  domainId: id,
  photoUrl,
});
export const updateMemberSchema = memberSchema.extend({ memberId: id, active: z.boolean() });

export const importMembersSchema = z.object({
  clubId: id,
  csv: z.string().min(1, "Paste at least one line.").max(20_000, "That's too much at once; split it into batches."),
});

export const domainSchema = z.object({ clubId: id, name: label("Domain name", 50) });

export const seasonSchema = z
  .object({
    clubId: id,
    name: label("Season name", 60),
    startDate: dateInput,
    endDate: dateInput,
    makeCurrent: z.boolean().default(false),
  })
  .refine((value) => value.endDate >= value.startDate, { message: "End date must be on or after the start date.", path: ["endDate"] });

export const joinRequestSchema = z.object({
  code: accessCode,
  name: personName,
  domainId: id,
  note: optionalText(280),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(0, "Bot detected.").optional(),
});

export const clubSettingsSchema = z.object({
  clubId: id,
  name: label("Club name", 80),
  description: optionalText(280),
  allowJoinRequests: z.boolean(),
});

export const adminRoleSchema = z.enum(["owner", "editor"]);
export const addAdminSchema = z.object({ clubId: id, email, name: personName, role: adminRoleSchema });

export const createClubSchema = z.object({
  name: label("Club name", 80),
  description: optionalText(280),
  ownerEmail: z.union([email, z.literal("")]).optional(),
  ownerName: z.string().trim().max(80).optional(),
  template: z.enum(["creative", "tech", "blank"]).default("blank"),
});

export const DOMAIN_TEMPLATES: Record<"creative" | "tech" | "blank", string[]> = {
  creative: ["Photography", "Videography", "Graphic Design", "UI/UX", "Illustration & Animation"],
  tech: ["Web Development", "App Development", "AI / ML", "Cybersecurity", "Competitive Programming"],
  blank: ["General"],
};

/**
 * Parses pasted member rows: `Name, Domain` per line. Header rows and blank
 * lines are skipped. Returns parsed rows plus per-line errors.
 */
export function parseMemberCsv(csv: string) {
  const rows: { line: number; name: string; domain: string }[] = [];
  const errors: { line: number; message: string }[] = [];
  csv.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const text = raw.trim();
    if (!text) return;
    const [rawName, ...rest] = text.split(/[,\t]/);
    const name = collapse(rawName ?? "").replace(/^"|"$/g, "");
    const domain = collapse(rest.join(",")).replace(/^"|"$/g, "");
    if (line === 1 && /^name$/i.test(name)) return;
    if (!name) return void errors.push({ line, message: "Missing name." });
    if (name.length > 80) return void errors.push({ line, message: "Name is longer than 80 characters." });
    if (!domain) return void errors.push({ line, message: `No domain given for “${name}”.` });
    rows.push({ line, name, domain });
  });
  return { rows, errors };
}

/** Flattens a ZodError into a single human message. */
export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}
