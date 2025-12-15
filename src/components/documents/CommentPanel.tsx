'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DocumentCommentWithAuthor,
  createDocumentComment,
  deleteDocumentComment,
  resolveDocumentComment,
  getDocumentComments,
  getProjectMembersForMentions
} from '@/app/actions/documentComments'
import { getProjectGroupsWithCounts } from '@/app/actions/groups'
import type { ProjectGroup } from '@/types/database'

interface CommentPanelProps {
  documentId: string
  projectId: string
  currentPage: number
  onClose: () => void
}

export default function CommentPanel({
  documentId,
  projectId,
  currentPage,
  onClose
}: CommentPanelProps) {
  const [comments, setComments] = useState<DocumentCommentWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [projectMembers, setProjectMembers] = useState<{ id: string; full_name: string | null; email: string }[]>([])
  const [groups, setGroups] = useState<(ProjectGroup & { member_count: number })[]>([])
  const [showMentionList, setShowMentionList] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [selectedMentions, setSelectedMentions] = useState<string[]>([])
  const [selectedGroupMentions, setSelectedGroupMentions] = useState<string[]>([])
  const [filterByPage, setFilterByPage] = useState(false)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadComments()
    loadProjectMembers()
  }, [documentId])

  const loadComments = async () => {
    setLoading(true)
    const data = await getDocumentComments(documentId)
    setComments(data)
    setLoading(false)
  }

  const loadProjectMembers = async () => {
    const [members, groupsData] = await Promise.all([
      getProjectMembersForMentions(projectId),
      getProjectGroupsWithCounts(projectId)
    ])
    setProjectMembers(members)
    setGroups(groupsData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || submitting) return

    setSubmitting(true)
    try {
      await createDocumentComment(documentId, projectId, {
        content: newComment,
        page_number: currentPage,
        mentioned_user_ids: selectedMentions,
        mentioned_group_ids: selectedGroupMentions,
      })
      setNewComment('')
      setSelectedMentions([])
      setSelectedGroupMentions([])
      await loadComments()
    } catch (error) {
      console.error('Error creating comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return

    setSubmitting(true)
    try {
      await createDocumentComment(documentId, projectId, {
        content: replyContent,
        parent_id: parentId,
        mentioned_user_ids: selectedMentions,
        mentioned_group_ids: selectedGroupMentions,
      })
      setReplyContent('')
      setReplyingTo(null)
      setSelectedMentions([])
      setSelectedGroupMentions([])
      await loadComments()
    } catch (error) {
      console.error('Error creating reply:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Är du säker på att du vill radera denna kommentar?')) return

    try {
      await deleteDocumentComment(commentId)
      await loadComments()
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleResolve = async (commentId: string, currentStatus: boolean) => {
    try {
      await resolveDocumentComment(commentId, !currentStatus)
      await loadComments()
    } catch (error) {
      console.error('Error resolving comment:', error)
    }
  }

  const insertMention = (user: { id: string; full_name: string | null; email: string }, isReply: boolean) => {
    const mention = `@${user.full_name || user.email} `

    if (isReply) {
      setReplyContent(prev => prev + mention)
      replyInputRef.current?.focus()
    } else {
      setNewComment(prev => prev + mention)
      inputRef.current?.focus()
    }

    if (!selectedMentions.includes(user.id)) {
      setSelectedMentions(prev => [...prev, user.id])
    }
    setShowMentionList(false)
    setMentionSearch('')
  }

  const insertGroupMention = (group: ProjectGroup & { member_count: number }, isReply: boolean) => {
    const mention = `@${group.name} `

    if (isReply) {
      setReplyContent(prev => prev + mention)
      replyInputRef.current?.focus()
    } else {
      setNewComment(prev => prev + mention)
      inputRef.current?.focus()
    }

    if (!selectedGroupMentions.includes(group.id)) {
      setSelectedGroupMentions(prev => [...prev, group.id])
    }
    setShowMentionList(false)
    setMentionSearch('')
  }

  const filteredMembers = projectMembers.filter(m => {
    const search = mentionSearch.toLowerCase()
    return (
      (m.full_name?.toLowerCase().includes(search) || false) ||
      m.email.toLowerCase().includes(search)
    )
  })

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  const filteredComments = filterByPage
    ? comments.filter(c => c.page_number === currentPage)
    : comments

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Kommentarer</h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-700 rounded"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 border-b border-slate-200">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filterByPage}
            onChange={(e) => setFilterByPage(e.target.checked)}
            className="rounded bg-white border-slate-300 text-blue-500"
          />
          Visa endast sida {currentPage}
        </label>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredComments.length === 0 ? (
          <p className="text-center text-slate-500 py-8">
            {filterByPage ? 'Inga kommentarer på denna sida' : 'Inga kommentarer ännu'}
          </p>
        ) : (
          filteredComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => setReplyingTo(comment.id)}
              onDelete={handleDelete}
              onResolve={handleResolve}
              formatDate={formatDate}
              replyingTo={replyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onSubmitReply={() => handleReply(comment.id)}
              onCancelReply={() => {
                setReplyingTo(null)
                setReplyContent('')
              }}
              replyInputRef={replyInputRef}
              projectMembers={projectMembers}
              groups={groups}
              insertMention={insertMention}
              insertGroupMention={insertGroupMention}
              submitting={submitting}
            />
          ))
        )}
      </div>

      {/* New comment form */}
      <div className="p-4 border-t border-slate-200">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value)
                // Check for @ trigger
                const lastChar = e.target.value.slice(-1)
                if (lastChar === '@') {
                  setShowMentionList(true)
                }
              }}
              placeholder={`Kommentera på sida ${currentPage}...`}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm resize-none focus:outline-none focus:border-blue-500"
              rows={3}
            />

            {/* Mention dropdown */}
            {showMentionList && (filteredGroups.length > 0 || filteredMembers.length > 0) && (
              <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-20">
                <div className="p-2">
                  <input
                    type="text"
                    value={mentionSearch}
                    onChange={(e) => setMentionSearch(e.target.value)}
                    placeholder="Sök grupper eller personer..."
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm text-slate-900"
                    autoFocus
                  />
                </div>

                {/* Groups section */}
                {filteredGroups.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-200">
                      Grupper
                    </div>
                    {filteredGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => insertGroupMention(group, false)}
                        className="w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-xs text-white"
                          style={{ backgroundColor: group.color }}
                        >
                          👥
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{group.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {group.member_count} pers
                        </span>
                      </button>
                    ))}
                  </>
                )}

                {/* Separator if both groups and members */}
                {filteredGroups.length > 0 && filteredMembers.length > 0 && (
                  <div className="border-t border-slate-200 my-1" />
                )}

                {/* Members section */}
                {filteredMembers.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-200">
                      Personer
                    </div>
                    {filteredMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => insertMention(member, false)}
                        className="w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                          {(member.full_name || member.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{member.full_name || 'Inget namn'}</div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {filteredGroups.length === 0 && filteredMembers.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-500">Inga matchningar</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setShowMentionList(!showMentionList)}
              className="text-slate-500 hover:text-blue-500 text-sm flex items-center gap-1"
              title="Nämn någon (@)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />
              </svg>
              @
            </button>
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm rounded-lg transition-colors"
            >
              {submitting ? 'Skickar...' : 'Skicka'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Comment item component
interface CommentItemProps {
  comment: DocumentCommentWithAuthor
  onReply: () => void
  onDelete: (id: string) => void
  onResolve: (id: string, currentStatus: boolean) => void
  formatDate: (date: string) => string
  replyingTo: string | null
  replyContent: string
  setReplyContent: (content: string) => void
  onSubmitReply: () => void
  onCancelReply: () => void
  replyInputRef: React.RefObject<HTMLTextAreaElement | null>
  projectMembers: { id: string; full_name: string | null; email: string }[]
  groups: (ProjectGroup & { member_count: number })[]
  insertMention: (user: { id: string; full_name: string | null; email: string }, isReply: boolean) => void
  insertGroupMention: (group: ProjectGroup & { member_count: number }, isReply: boolean) => void
  submitting: boolean
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  onResolve,
  formatDate,
  replyingTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  onCancelReply,
  replyInputRef,
  projectMembers,
  groups,
  insertMention,
  insertGroupMention,
  submitting
}: CommentItemProps) {
  const [showReplyMentions, setShowReplyMentions] = useState(false)
  const [replyMentionSearch, setReplyMentionSearch] = useState('')

  const filteredReplyMembers = projectMembers.filter(m => {
    const search = replyMentionSearch.toLowerCase()
    return (
      (m.full_name?.toLowerCase().includes(search) || false) ||
      m.email.toLowerCase().includes(search)
    )
  })

  const filteredReplyGroups = groups.filter(g =>
    g.name.toLowerCase().includes(replyMentionSearch.toLowerCase())
  )

  return (
    <div className={`rounded-lg ${comment.is_resolved ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'} p-3`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium">
            {(comment.author?.full_name || comment.author?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">
              {comment.author?.full_name || comment.author?.email || 'Okänd'}
            </div>
            <div className="text-xs text-slate-500">
              {formatDate(comment.created_at)}
              {comment.page_number && (
                <span className="ml-2 px-1.5 py-0.5 bg-slate-200 rounded text-slate-600">
                  Sida {comment.page_number}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onResolve(comment.id, comment.is_resolved)}
            className={`p-1 rounded ${comment.is_resolved ? 'text-green-600 hover:text-green-500' : 'text-slate-400 hover:text-green-500'}`}
            title={comment.is_resolved ? 'Markera som olöst' : 'Markera som löst'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            className="p-1 text-slate-400 hover:text-red-500 rounded"
            title="Radera"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>

      {/* Mentions */}
      {comment.mentions && comment.mentions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {comment.mentions.map((mention) => (
            <span
              key={mention.id}
              className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded"
            >
              @{mention.mentioned_user?.full_name || mention.mentioned_user?.email}
            </span>
          ))}
        </div>
      )}

      {/* Reply button */}
      {!comment.is_resolved && replyingTo !== comment.id && (
        <button
          onClick={onReply}
          className="mt-2 text-xs text-blue-600 hover:text-blue-500"
        >
          Svara
        </button>
      )}

      {/* Reply form */}
      {replyingTo === comment.id && (
        <div className="mt-3 pl-4 border-l-2 border-slate-200">
          <div className="relative">
            <textarea
              ref={replyInputRef}
              value={replyContent}
              onChange={(e) => {
                setReplyContent(e.target.value)
                if (e.target.value.slice(-1) === '@') {
                  setShowReplyMentions(true)
                }
              }}
              placeholder="Skriv ett svar..."
              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-900 resize-none focus:outline-none focus:border-blue-500"
              rows={2}
              autoFocus
            />

            {showReplyMentions && (filteredReplyGroups.length > 0 || filteredReplyMembers.length > 0) && (
              <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto z-10">
                {/* Search input */}
                <div className="p-1.5">
                  <input
                    type="text"
                    value={replyMentionSearch}
                    onChange={(e) => setReplyMentionSearch(e.target.value)}
                    placeholder="Sök..."
                    className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
                    autoFocus
                  />
                </div>

                {/* Groups */}
                {filteredReplyGroups.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-slate-500 border-b border-slate-200">Grupper</div>
                    {filteredReplyGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          insertGroupMention(group, true)
                          setShowReplyMentions(false)
                          setReplyMentionSearch('')
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs text-slate-900 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center text-[10px]"
                          style={{ backgroundColor: group.color }}
                        >
                          👥
                        </div>
                        <span className="font-medium flex-1">{group.name}</span>
                        <span className="text-slate-500">{group.member_count}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Separator */}
                {filteredReplyGroups.length > 0 && filteredReplyMembers.length > 0 && (
                  <div className="border-t border-slate-200 my-0.5" />
                )}

                {/* Members */}
                {filteredReplyMembers.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-slate-500 border-b border-slate-200">Personer</div>
                    {filteredReplyMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => {
                          insertMention(member, true)
                          setShowReplyMentions(false)
                          setReplyMentionSearch('')
                        }}
                        className="w-full px-2 py-1.5 text-left text-xs text-slate-900 hover:bg-slate-100 flex items-center gap-2"
                      >
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">
                          {(member.full_name || member.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{member.full_name || member.email}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={onSubmitReply}
              disabled={!replyContent.trim() || submitting}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs rounded"
            >
              Svara
            </button>
            <button
              onClick={onCancelReply}
              className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="bg-slate-100 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-xs text-white">
                  {(reply.author?.full_name || reply.author?.email || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-900">
                  {reply.author?.full_name || reply.author?.email}
                </span>
                <span className="text-xs text-slate-500">{formatDate(reply.created_at)}</span>
              </div>
              <p className="text-xs text-slate-700">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
