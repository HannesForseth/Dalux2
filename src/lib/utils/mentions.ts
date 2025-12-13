// Helper to parse @mentions from text
// Returns array of user IDs that were mentioned
export function parseMentions(text: string, members: { user_id: string; full_name: string; email?: string }[]): string[] {
  const mentionedUserIds: string[] = []

  // Match @Name patterns (supports names with spaces like "@John Doe" or emails)
  const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)?)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionedName = match[1].toLowerCase()

    // Find matching member by name or email
    const member = members.find(m => {
      const name = m.full_name || m.email || ''
      return (
        name.toLowerCase().includes(mentionedName) ||
        name.toLowerCase().split(' ')[0] === mentionedName ||
        (m.email && m.email.toLowerCase().includes(mentionedName))
      )
    })

    if (member && !mentionedUserIds.includes(member.user_id)) {
      mentionedUserIds.push(member.user_id)
    }
  }

  return mentionedUserIds
}

// Parse @mentions and also match group names
// Returns both user IDs and group IDs
export function parseMentionsWithGroups(
  text: string,
  members: { user_id: string; full_name: string; email?: string }[],
  groups: { id: string; name: string }[]
): { userIds: string[]; groupIds: string[] } {
  const mentionedUserIds: string[] = []
  const mentionedGroupIds: string[] = []

  // Match @Name patterns (supports names with spaces like "@John Doe" or group names like "@Beställare")
  const mentionRegex = /@([^\s@]+(?:\s+[^\s@]+)?)/g
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionedName = match[1].toLowerCase()

    // First check if it matches a group name (groups take priority)
    const group = groups.find(g =>
      g.name.toLowerCase() === mentionedName ||
      g.name.toLowerCase().startsWith(mentionedName)
    )

    if (group && !mentionedGroupIds.includes(group.id)) {
      mentionedGroupIds.push(group.id)
      continue // Don't also match as a user
    }

    // Find matching member by name or email
    const member = members.find(m => {
      const name = m.full_name || m.email || ''
      return (
        name.toLowerCase().includes(mentionedName) ||
        name.toLowerCase().split(' ')[0] === mentionedName ||
        (m.email && m.email.toLowerCase().includes(mentionedName))
      )
    })

    if (member && !mentionedUserIds.includes(member.user_id)) {
      mentionedUserIds.push(member.user_id)
    }
  }

  return { userIds: mentionedUserIds, groupIds: mentionedGroupIds }
}
