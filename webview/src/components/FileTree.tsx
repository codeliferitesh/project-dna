import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileSpreadsheet,
  FileBox,
  Image,
  Palette,
  Lock,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  ChevronsDown,
  ChevronsUp,
  ExternalLink,
} from 'lucide-react';
import { FileCategory, FileNode } from '../types';

interface FileTreeProps {
  rootNode: FileNode | null;
  onOpenFile: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({ rootNode, onOpenFile }) => {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Auto-expand top-level folders by default
    if (rootNode?.children) {
      initial.add(rootNode.id);
      rootNode.children.forEach((c) => {
        if (c.type === 'directory') {
          initial.add(c.id);
        }
      });
    }
    return initial;
  });

  const [searchQuery, setSearchQuery] = useState('');

  const toggleDir = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!rootNode) {
      return;
    }
    const all = new Set<string>();
    const collect = (node: FileNode) => {
      if (node.type === 'directory') {
        all.add(node.id);
        node.children?.forEach(collect);
      }
    };
    collect(rootNode);
    setExpandedDirs(all);
  };

  const collapseAll = () => {
    setExpandedDirs(new Set());
  };

  // Filter tree when search query is entered
  const filteredRoot = useMemo(() => {
    if (!rootNode || !searchQuery.trim()) {
      return rootNode;
    }

    const query = searchQuery.toLowerCase().trim();

    const filterNode = (node: FileNode): FileNode | null => {
      if (node.type === 'file') {
        const matchesName = node.name.toLowerCase().includes(query);
        const matchesRel = node.relativePath.toLowerCase().includes(query);
        const matchesCat = node.category?.toLowerCase().includes(query);
        return matchesName || matchesRel || matchesCat ? node : null;
      }

      if (node.type === 'directory') {
        const filteredChildren = (node.children || [])
          .map(filterNode)
          .filter((c): c is FileNode => c !== null);

        const dirMatches = node.name.toLowerCase().includes(query);
        if (dirMatches || filteredChildren.length > 0) {
          return {
            ...node,
            children: filteredChildren,
          };
        }
      }

      return null;
    };

    return filterNode(rootNode);
  }, [rootNode, searchQuery]);

  if (!rootNode) {
    return null;
  }

  const formatSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const renderFileIcon = (category?: FileCategory, ext?: string) => {
    switch (category) {
      case 'source':
        return <FileCode className="tree-icon" color="#3b82f6" />;
      case 'test':
        return <FileCode className="tree-icon" color="#10b981" />;
      case 'config':
        return <FileSpreadsheet className="tree-icon" color="#f59e0b" />;
      case 'documentation':
        return <FileText className="tree-icon" color="#8b5cf6" />;
      case 'style':
        return <Palette className="tree-icon" color="#f43f5e" />;
      case 'asset':
        return <Image className="tree-icon" color="#06b6d4" />;
      case 'lockfile':
        return <Lock className="tree-icon" color="#a855f7" />;
      case 'data':
        return <FileBox className="tree-icon" color="#eab308" />;
      default:
        if (ext === '.json') {
          return <FileSpreadsheet className="tree-icon" color="#f59e0b" />;
        }
        return <File className="tree-icon" color="#71717a" />;
    }
  };

  const renderNode = (node: FileNode, depth = 0): React.ReactNode => {
    const isDir = node.type === 'directory';
    const isExpanded = expandedDirs.has(node.id) || searchQuery.trim().length > 0;
    const paddingLeft = depth * 16 + 6;

    if (isDir) {
      return (
        <div key={node.id}>
          <div
            className="tree-node-row"
            style={{ paddingLeft }}
            onClick={(e) => toggleDir(node.id, e)}
          >
            <div className="tree-node-main">
              <span className="tree-chevron">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              {isExpanded ? (
                <FolderOpen className="tree-icon" color="#60a5fa" />
              ) : (
                <Folder className="tree-icon" color="#3b82f6" />
              )}
              <span className="tree-node-name directory">{node.name}</span>
            </div>

            <div className="tree-node-meta">
              <span>{node.fileCount || 0} files</span>
              <span className="tree-file-size">{formatSize(node.size)}</span>
            </div>
          </div>

          {isExpanded && node.children && (
            <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    // File Row
    return (
      <div
        key={node.id}
        className="tree-node-row"
        style={{ paddingLeft: paddingLeft + 14 }}
        onClick={() => onOpenFile(node.path)}
        title={`Click to open ${node.relativePath} in editor`}
      >
        <div className="tree-node-main">
          {renderFileIcon(node.category, node.extension)}
          <span className="tree-node-name">{node.name}</span>
        </div>

        <div className="tree-node-meta">
          {node.category && (
            <span className={`category-badge ${node.category}`}>{node.category}</span>
          )}
          <span className="tree-file-size">{formatSize(node.size)}</span>
          <ExternalLink size={12} style={{ opacity: 0.5 }} />
        </div>
      </div>
    );
  };

  return (
    <div className="tree-container">
      <div className="tree-toolbar">
        <div className="tree-search-wrap">
          <Search size={14} color="#71717a" />
          <input
            type="text"
            className="tree-search-input"
            placeholder="Search files or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tree-actions">
          <button className="btn btn-secondary" onClick={expandAll} title="Expand All Directories">
            <ChevronsDown size={13} />
            <span>Expand All</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={collapseAll}
            title="Collapse All Directories"
          >
            <ChevronsUp size={13} />
            <span>Collapse All</span>
          </button>
        </div>
      </div>

      <div className="tree-content">
        {filteredRoot ? (
          filteredRoot.type === 'directory' && filteredRoot.children ? (
            filteredRoot.children.map((child) => renderNode(child, 0))
          ) : (
            renderNode(filteredRoot, 0)
          )
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No files matched "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};
