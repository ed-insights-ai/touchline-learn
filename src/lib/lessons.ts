import { existsSync } from "node:fs";
import { join } from "node:path";
import { archive } from "./archive-parts";
import { collection } from "./parts";
import type { Lesson } from "./lesson";

const lessons: Lesson[] = [collection, archive];

const slugOf = (routeId: string) => routeId.replace(/^modules\//, "").replace(/\.mdx?$/, "");

export const lessonForRoute = (routeId: string): Lesson => {
  const slug = slugOf(routeId);
  return lessons.find((l) => slug === l.slug || slug.startsWith(`${l.slug}-`)) ?? collection;
};

export const isLessonPage = (routeId: string) => lessons.some((l) => l.slug === slugOf(routeId));

export const modulePageExists = (slug: string) =>
  [".md", ".mdx"].some((ext) => existsSync(join(process.cwd(), "src", "content", "docs", "modules", `${slug}${ext}`)));

export const filmExists = (file: string) => existsSync(join(process.cwd(), "public", "film", file));
