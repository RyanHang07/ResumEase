# Tailor guard rules

Reference for the tailoring skill. The ResumEase Claude tab runs these checks every time a JSON loads, comparing it against the pinned base (Saved > pin). Issues show as warnings. The load and the PDF download still go ahead.

Source: `src/lib/tailorGuard.ts`. Tests with worked examples: `src/lib/tailorGuard.test.ts`.

## What may change freely
- `name`, `templateId`, `jobTarget`, `lastModified`.
- Bullet order within an entry.
- Skill order within a category, category order, and which category a skill sits in.
- techStack order.

## Checked, with how matching works

| Rule | How it is matched | Warning text |
|---|---|---|
| `id` unchanged | exact | `id changed` |
| Header fields unchanged | each field, exact | `<field> changed` |
| Sections: same ids in the same positions, same names, same `order` | by position | `section missing or moved`, `section renamed`, `section order changed` |
| Entries: same ids in the same positions | by position within the section | `entry missing or moved`, `entry count changed` |
| Entry fields unchanged: role, organization, title, location, dates, links, coursework, GPA, graduation | per entry, exact | `<field> changed` |
| Same number of bullets per entry | per entry | `bullet count changed from X to Y` |
| No bullet grows | **per entry, order-insensitive.** Both sides are sorted longest first and compared rank by rank: the longest tailored bullet must be no longer than the longest base bullet, the second longest no longer than the second longest, and so on. This passes exactly when every tailored bullet can be paired with a different base bullet that is at least as long. | `longer than the base allows (N chars; the matching base bullet is M)` |
| Every metric kept | **per entry, not per bullet.** Every number with its unit in the base entry's bullets (for example `30%`, `900+`, `50ms`, and `1` and `12` in "1 in 12") must appear at least as many times somewhere in the tailored entry's bullets. A metric may move to another bullet in the same entry. | `metric dropped or changed: ...` |
| No new numbers | per entry, the reverse of the line above | `number not in the base: ...` |
| Skills only added | **per skills section**, case-insensitive, across all categories | `skills removed: ...`, `<n> skills added (max 5)` |
| Categories kept | by category id (order free) | `category removed`, `category added`, `category renamed` |
| techStack only added | per entry, case-insensitive | `techStack removed: ...` |
| No em dash (U+2014) | everywhere except `jobTarget.jdText` | `contains an em dash` |

## Consequences for tailoring
- Reordering bullets, and rewrites that keep every metric in the entry and add no length, produce **no warnings**. A pure reorder is listed as "reordered only" for information.
- Since length is paired longest to longest, a short bullet can become longer than it was, as long as some other bullet in the same entry became shorter by at least as much.
- A metric can move from one bullet to another, but only within the same entry.
- A number introduced in a rewrite (even "2 teams") warns, because it may be invented. Spell out small counts as words if they are already words in the base.
- Section and entry order stay frozen, because they change what a reader sees first.

## Diff display
Unchanged bullets pair with themselves. Each changed bullet pairs with the most similar unused base bullet (by word overlap) and shows as `bullet N (was M)` when it moved. The pairing is for display only and does not affect the checks.
