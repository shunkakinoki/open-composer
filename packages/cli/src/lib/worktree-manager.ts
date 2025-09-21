import { exec } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface Worktree {
  name: string;
  path: string;
  branch: string;
  active: boolean;
}

export class WorktreeManager {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  async listWorktrees(): Promise<Worktree[]> {
    try {
      const { stdout } = await execAsync("git worktree list --porcelain", {
        cwd: this.basePath,
      });

      const worktrees: Worktree[] = [];
      const lines = stdout.trim().split("\n");

      let currentWorktree: Partial<Worktree> = {};

      for (const line of lines) {
        if (line.startsWith("worktree ")) {
          const worktreePath = line.substring(9);
          currentWorktree.path = worktreePath;
          currentWorktree.name = path.basename(worktreePath);
        } else if (line.startsWith("branch ")) {
          const branch = line.substring(7);
          currentWorktree.branch = branch.replace("refs/heads/", "");
        } else if (
          line === "" &&
          currentWorktree.path &&
          currentWorktree.name
        ) {
          worktrees.push({
            name: currentWorktree.name,
            path: currentWorktree.path,
            branch: currentWorktree.branch || "unknown",
            active: currentWorktree.path === this.basePath,
          });
          currentWorktree = {};
        }
      }

      if (currentWorktree.path && currentWorktree.name) {
        worktrees.push({
          name: currentWorktree.name,
          path: currentWorktree.path,
          branch: currentWorktree.branch || "unknown",
          active: currentWorktree.path === this.basePath,
        });
      }

      return worktrees;
    } catch (error) {
      console.warn("Failed to list worktrees:", error);
      return [
        {
          name: "main",
          path: this.basePath,
          branch: "main",
          active: true,
        },
      ];
    }
  }

  async createWorktree(
    branchName: string,
    worktreeName?: string,
  ): Promise<Worktree> {
    const name = worktreeName || branchName;
    const worktreePath = path.join(path.dirname(this.basePath), `${name}-wt`);

    try {
      await execAsync(`git worktree add ${worktreePath} -b ${branchName}`, {
        cwd: this.basePath,
      });

      return {
        name,
        path: worktreePath,
        branch: branchName,
        active: false,
      };
    } catch (error) {
      throw new Error(`Failed to create worktree: ${error}`);
    }
  }

  async removeWorktree(worktreePath: string): Promise<void> {
    try {
      await execAsync(`git worktree remove ${worktreePath}`, {
        cwd: this.basePath,
      });
    } catch (error) {
      throw new Error(`Failed to remove worktree: ${error}`);
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync("git branch --show-current", {
        cwd: this.basePath,
      });
      return stdout.trim();
    } catch (_error) {
      return "main";
    }
  }

  async switchWorktree(worktreePath: string): Promise<void> {
    this.basePath = worktreePath;
    process.chdir(worktreePath);
  }
}
