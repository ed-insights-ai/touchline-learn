const at = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
/** "November 21" */
export const monthDay = (iso: string) => at(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
/** "Saturday, November 21" */
export const weekdayMonthDay = (iso: string) => at(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
