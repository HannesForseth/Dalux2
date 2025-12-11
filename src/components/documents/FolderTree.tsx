'use client'

import { useState, useEffect } from 'react'

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
  onSelect
}: {
  node: FolderNode
  level: number
  currentPath: string
  expandedPaths: Set<string>
  onToggle: (path: string) => void
  onSelect: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = currentPath === node.path
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer rounded transition-colors ${
          isSelected
            ? 'bg-blue-600/20 text-blue-400'
            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.path)}
      >
        {/* Expand/Collapse arrow */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggle(node.path)
          }}
          className={`w-4 h-4 flex items-center justify-center ${
            hasChildren ? 'text-slate-500 hover:text-white' : 'invisible'
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
          className={`h-4 w-4 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-yellow-500'}`}
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
        <span className="truncate text-sm flex-1">{node.name}</span>

        {/* File count */}
        {node.fileCount > 0 && (
          <span className="text-xs text-slate-500 ml-1">{node.fileCount}</span>
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
  onSelectFolder
}: FolderTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']))

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

  const tree = buildFolderTree(folders, documentCounts)

  return (
    <div className="py-2">
      <FolderTreeNode
        node={tree}
        level={0}
        currentPath={currentPath}
        expandedPaths={expandedPaths}
        onToggle={handleToggle}
        onSelect={onSelectFolder}
      />
    </div>
  )
}
