'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface FolderNode {
  name: string
  path: string
  children: FolderNode[]
  fileCount: number
}

interface FolderTreeProps {
  folders: string[]
  documentCounts: Record<string, number>
  currentPath: string
  onSelectFolder: (path: string) => void
  onDropFiles?: (folderPath: string, documentIds: string[]) => void
  onCreateSubfolder?: (parentPath: string) => void
  onRenameFolder?: (path: string) => void
  onDeleteFolder?: (path: string) => void
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  folderPath: string
  folderName: string
}

function buildFolderTree(folders: string[], documentCounts: Record<string, number>): FolderNode {
  const root: FolderNode = {
    name: 'Filer',
    path: '/',
    children: [],
    fileCount: documentCounts['/'] || 0
  }

  // Sort folders to ensure parent folders come before children
  const sortedFolders = [...folders].sort()

  sortedFolders.forEach(folderPath => {
    if (folderPath === '/') return

    const parts = folderPath.split('/').filter(Boolean)
    let currentNode = root

    parts.forEach((part, index) => {
      const existingChild = currentNode.children.find(c => c.name === part)
      const partPath = '/' + parts.slice(0, index + 1).join('/') + '/'

      if (existingChild) {
        currentNode = existingChild
      } else {
        const newNode: FolderNode = {
          name: part,
          path: partPath,
          children: [],
          fileCount: documentCounts[partPath] || 0
        }
        currentNode.children.push(newNode)
        currentNode = newNode
      }
    })
  })

  return root
}

function FolderTreeNode({
  node,
  level,
  currentPath,
  expandedPaths,
  onToggle,
  onSelect,
  onContextMenu,
  onDrop,
  dragOverPath,
  setDragOverPath
}: {
  node: FolderNode
  level: number
  currentPath: string
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
  onContextMenu: (e: React.MouseEvent, path: string, name: string) => void
  onDrop?: (folderPath: string, documentIds: string[]) => void
  dragOverPath: string | null
  setDragOverPath: (path: string | null) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = currentPath === node.path
  const hasChildren = node.children.length > 0
  const isDragOver = dragOverPath === node.path

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPath(node.path)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only clear if we're leaving this specific element
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverPath(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPath(null)

    try {
      const data = e.dataTransfer.getData('application/json')
      if (data) {
        const { documentIds } = JSON.parse(data)
        if (documentIds && documentIds.length > 0 && onDrop) {
          onDrop(node.path, documentIds)
        }
      }
    } catch (err) {
      console.error('Drop error:', err)
    }
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1.5 px-2 cursor-pointer rounded-lg transition-all ${
          isDragOver
            ? 'bg-indigo-100 ring-2 ring-indigo-500 ring-inset'
            : isSelected
            ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-700 border-l-2 border-indigo-500'
            : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.path)}
        onContextMenu={(e) => onContextMenu(e, node.path, node.name)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/Collapse arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggle(node.path)
          }}
          className={`w-4 h-4 flex items-center justify-center ${
            hasChildren ? 'text-slate-400 hover:text-slate-700' : 'invisible'
          }`}
        >
          <svg
            className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Folder icon */}
        <svg
          className={`h-4 w-4 flex-shrink-0 ${isDragOver ? 'text-indigo-500' : isSelected ? 'text-indigo-500' : 'text-amber-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          {isExpanded ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
            />
          )}
        </svg>

        {/* Folder name */}
        <span className="truncate text-sm flex-1 font-medium">{node.name}</span>

        {/* File count */}
        {node.fileCount > 0 && (
          <span className="text-xs text-slate-400 ml-1 bg-slate-100 px-1.5 py-0.5 rounded-full">{node.fileCount}</span>
        )}
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {node.children
            .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
            .map(child => (
              <FolderTreeNode
                key={child.path}
                node={child}
                level={level + 1}
                currentPath={currentPath}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                onDrop={onDrop}
                dragOverPath={dragOverPath}
                setDragOverPath={setDragOverPath}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export default function FolderTree({
  folders,
  documentCounts,
  currentPath,
  onSelectFolder,
  onDropFiles,
  onCreateSubfolder,
  onRenameFolder,
  onDeleteFolder
}: FolderTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']))
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    folderPath: '',
    folderName: ''
  })
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Auto-expand path to current folder
  useEffect(() => {
    if (currentPath !== '/') {
      const parts = currentPath.split('/').filter(Boolean)
      const pathsToExpand = new Set(expandedPaths)

      let buildPath = '/'
      pathsToExpand.add(buildPath)

      parts.forEach(part => {
        buildPath += part + '/'
        pathsToExpand.add(buildPath)
      })

      setExpandedPaths(pathsToExpand)
    }
  }, [currentPath])

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.visible])

  const handleToggle = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleContextMenu = (e: React.MouseEvent, path: string, name: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      folderPath: path,
      folderName: name
    })
  }

  const handleDrop = (folderPath: string, documentIds: string[]) => {
    if (onDropFiles) {
      onDropFiles(folderPath, documentIds)
    }
  }

  const tree = buildFolderTree(folders, documentCounts)

  return (
    <div className="py-2 relative">
      <FolderTreeNode
        node={tree}
        level={0}
        currentPath={currentPath}
        expandedPaths={expandedPaths}
        onToggle={handleToggle}
        onSelect={onSelectFolder}
        onContextMenu={handleContextMenu}
        onDrop={handleDrop}
        dragOverPath={dragOverPath}
        setDragOverPath={setDragOverPath}
      />

      {/* Context Menu - rendered via portal to escape overflow container */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {contextMenu.visible && (
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed z-[9999] bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-48"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-500 truncate">{contextMenu.folderPath === '/' ? 'Rot' : contextMenu.folderName}</p>
              </div>

              <button
                onClick={() => {
                  onSelectFolder(contextMenu.folderPath)
                  setContextMenu(prev => ({ ...prev, visible: false }))
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                </svg>
                Öppna mapp
              </button>

              {onCreateSubfolder && (
                <button
                  onClick={() => {
                    onCreateSubfolder(contextMenu.folderPath)
                    setContextMenu(prev => ({ ...prev, visible: false }))
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
                  Skapa undermapp
                </button>
              )}

              {contextMenu.folderPath !== '/' && (
                <>
                  <div className="border-t border-slate-100 my-1" />

                  {onRenameFolder && (
                    <button
                      onClick={() => {
                        onRenameFolder(contextMenu.folderPath)
                        setContextMenu(prev => ({ ...prev, visible: false }))
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                      Byt namn
                    </button>
                  )}

                  {onDeleteFolder && (
                    <button
                      onClick={() => {
                        onDeleteFolder(contextMenu.folderPath)
                        setContextMenu(prev => ({ ...prev, visible: false }))
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                      Ta bort mapp
                    </button>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
