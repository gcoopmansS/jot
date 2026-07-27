/\*\*

- SECURITY UPDATE LOG - Query Key User-Scoping Migration
-
- This file documents all query keys that need to be updated to include user IDs
- to prevent data leakage between accounts.
-
- BEFORE (INSECURE):
- queryKey: ["projects"]
- queryKey: ["notes"]
-
- AFTER (SECURE):
- queryKey: ["projects", userId]
- queryKey: ["notes", userId]
-
- Files to update:
- - components/sidebar/sidebar.tsx
- - app/(app)/everything/page.tsx
- - app/(app)/unsorted/page.tsx
- - app/(app)/projects/[id]/page.tsx
- - app/(app)/projects/[id]/meetings/[meetingId]/page.tsx
- - app/(app)/projects/[id]/topics/[topicId]/page.tsx
- - app/(app)/notes/[id]/page.tsx
- - components/app-header/app-header.tsx
- - components/search-results/search-results.tsx
- - components/note-card/note-card.tsx
- - components/series-banner/series-banner.tsx
- - components/capture/categorize-bar.tsx
    \*/
