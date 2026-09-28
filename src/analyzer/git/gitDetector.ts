import * as fs from 'fs/promises';
import * as path from 'path';
import { GitInfo } from '../../models';

export class GitDetector {
  /**
   * Detects Git repository metadata strictly locally from the .git directory.
   * Zero network calls, zero external API dependencies.
   */
  public async detect(workspaceRoot: string): Promise<GitInfo | null> {
    const gitDir = path.join(workspaceRoot, '.git');

    try {
      const stats = await fs.stat(gitDir);
      if (!stats.isDirectory()) {
        return { isGitRepo: false };
      }
    } catch {
      return { isGitRepo: false };
    }

    let currentBranch: string | undefined;
    let lastCommitHash: string | undefined;
    let remoteUrl: string | undefined;

    // 1. Read .git/HEAD to find current branch
    try {
      const headContent = await fs.readFile(path.join(gitDir, 'HEAD'), 'utf8');
      const headTrimmed = headContent.trim();
      if (headTrimmed.startsWith('ref: refs/heads/')) {
        currentBranch = headTrimmed.replace('ref: refs/heads/', '');
        // Read branch ref for last commit hash
        try {
          const refPath = path.join(gitDir, 'refs', 'heads', currentBranch);
          const commitContent = await fs.readFile(refPath, 'utf8');
          lastCommitHash = commitContent.trim().substring(0, 8);
        } catch {
          // May be in packed-refs or detached
        }
      } else if (/^[0-9a-f]{40}$/i.test(headTrimmed)) {
        // Detached HEAD
        currentBranch = 'DETACHED_HEAD';
        lastCommitHash = headTrimmed.substring(0, 8);
      }
    } catch {
      // safe fallback
    }

    // 2. Read .git/config to extract origin URL if present
    try {
      const configContent = await fs.readFile(path.join(gitDir, 'config'), 'utf8');
      const remoteMatch = configContent.match(/\[remote\s+"origin"\][\s\S]*?url\s*=\s*(.+)/);
      if (remoteMatch && remoteMatch[1]) {
        remoteUrl = remoteMatch[1].trim();
      }
    } catch {
      // safe fallback
    }

    return {
      isGitRepo: true,
      currentBranch: currentBranch || 'main',
      lastCommitHash: lastCommitHash,
      remoteUrl: remoteUrl,
      status: 'clean',
    };
  }
}
