// Helper to parse @mentions from text
// Returns array of user IDs that were mentioned
export function parseMentions(text: string, members: { user_id: string; full_name: string }[]): string[] {
  const mentionedUserIds: string[] = []

  // Match @Name patterns (supports names with spaces like "@John Doe")
  const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)?)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionedName = match[1].toLowerCase()

    // Find matching member
    const member = members.find(m =>
      m.full_name?.toLowerCase().includes(mentionedName) ||
      m.full_name?.toLowerCase().split(' ')[0] === mentionedName
    )

    if (member && !mentionedUserIds.includes(member.user_id)) {
      mentionedUserIds.push(member.user_id)
    }
  }

  return mentionedUserIds
}
