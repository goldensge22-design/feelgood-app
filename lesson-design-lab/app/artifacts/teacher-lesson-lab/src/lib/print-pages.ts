/** Keep roster order and never put two students on the same sheet. */
export function studentPages<T extends { studentId: string }>(items: T[], perPage: number): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.studentId) ?? [];
    group.push(item);
    groups.set(item.studentId, group);
  }
  const pages: T[][] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += perPage) pages.push(group.slice(i, i + perPage));
  }
  return pages;
}

export const campSheets = (students: number, cardsPerStudent: number) =>
  Math.max(0, students) * Math.ceil(Math.max(0, cardsPerStudent) / 2);
