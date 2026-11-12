/**
 * Cache tags shared by cached reads ('use cache' + cacheTag) and the server
 * actions that invalidate them (updateTag). Keep producers and consumers here
 * so a new mutation can't forget a tag.
 */

/** Everything about one club: public board and dashboard data. */
export const clubTag = (clubId: string) => `board:${clubId}`;

/** Who can manage a club (team roles). */
export const accessTag = (clubId: string) => `access:${clubId}`;

/** Per-user data: platform-admin flag and the user's club list. */
export const viewerTag = (userId: string) => `viewer:${userId}`;

/** Cross-club platform views (overview, platform admins, audit log). */
export const PLATFORM_TAG = "platform";

/** Authorisation reads: short-lived on top of tag invalidation. */
export const ACCESS_LIFE = { stale: 30, revalidate: 60, expire: 300 };
