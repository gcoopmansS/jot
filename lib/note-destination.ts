/**
 * Where a note lands after being filed, given the categorization data
 * CategorizeBar's onSave passes back. Used to navigate there afterward so
 * filing a note gives visual confirmation it actually landed somewhere,
 * instead of just closing back to wherever you started.
 */
export function getFiledNoteDestination(data: {
  type: "meeting" | "general";
  projectId?: string;
  meetingId?: string;
  topicId?: string;
  isUnsorted?: boolean;
}): string {
  if (data.isUnsorted || !data.projectId) {
    return "/unsorted";
  }

  if (data.type === "meeting" && data.meetingId) {
    return `/projects/${data.projectId}/meetings/${data.meetingId}`;
  }

  if (data.type === "general" && data.topicId) {
    return `/projects/${data.projectId}/topics/${data.topicId}`;
  }

  return "/unsorted";
}
