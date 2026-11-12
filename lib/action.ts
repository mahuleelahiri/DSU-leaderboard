import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db";
import { AuthorizationError } from "@/lib/dal";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

export type ActionResult<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

/** An error whose message is safe to show to the user. */
export class UserFacingError extends Error {}

/**
 * Wraps a server action body: validates input with zod, converts known
 * failures to friendly messages, and never leaks internal errors to clients.
 */
export async function runAction<S extends z.ZodType, T>(
  name: string,
  schema: S,
  input: unknown,
  body: (data: z.output<S>) => Promise<T | { data: T; message: string }>,
  messages: { unique?: string; foreignKey?: string } = {},
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const result = await body(parsed.data);
    if (result && typeof result === "object" && "message" in result && "data" in result) {
      return { ok: true, data: result.data as T, message: result.message as string };
    }
    return { ok: true, data: result as T };
  } catch (error) {
    // Let Next.js control-flow errors (redirect, notFound) propagate.
    unstable_rethrow(error);
    if (error instanceof UserFacingError || error instanceof AuthorizationError) return { ok: false, error: error.message };
    if (isUniqueViolation(error)) return { ok: false, error: messages.unique ?? "That already exists." };
    if (isForeignKeyViolation(error)) return { ok: false, error: messages.foreignKey ?? "This item is still in use elsewhere." };
    logger.error("action.failed", { action: name, error: error instanceof Error ? error.message : String(error) });
    return { ok: false, error: "Something went wrong on our side. Please try again." };
  }
}
