// -----------------------------------------------------------------------------
// Parsed Worktree
// -----------------------------------------------------------------------------

export interface ParsedWorktree {
  readonly path: string;
  readonly head?: string | undefined;
  readonly branch?: string | undefined;
  readonly bare: boolean;
  readonly detached: boolean;
  readonly locked?:
    | {
        readonly reason?: string | undefined;
      }
    | undefined;
  readonly prunable?:
    | {
        readonly reason?: string | undefined;
      }
    | undefined;
}

class ParseState {
  path?: string | undefined;
  head?: string | undefined;
  branch?: string | undefined;
  bare = false;
  detached = false;
  lockedReason?: string | undefined;
  prunableReason?: string | undefined;

  reset(): void {
    this.path = undefined;
    this.head = undefined;
    this.branch = undefined;
    this.bare = false;
    this.detached = false;
    this.lockedReason = undefined;
    this.prunableReason = undefined;
  }

  toWorktree(): ParsedWorktree {
    if (!this.path) {
      throw new Error("Expected worktree path in porcelain entry");
    }

    return {
      path: this.path,
      head: this.head,
      branch: this.branch,
      bare: this.bare,
      detached: this.detached,
      locked:
        this.lockedReason !== undefined
          ? { reason: this.lockedReason }
          : undefined,
      prunable:
        this.prunableReason !== undefined
          ? { reason: this.prunableReason }
          : undefined,
    } satisfies ParsedWorktree;
  }
}

const trimOrUndefined = (value: string | undefined): string | undefined => {
  const next = value?.trim();
  return next ? next : undefined;
};

export const parsePorcelainList = (raw: string): readonly ParsedWorktree[] => {
  const lines = raw.split(/\r?\n/);
  const state = new ParseState();
  const worktrees: ParsedWorktree[] = [];

  const flush = () => {
    if (state.path === undefined) {
      return;
    }
    worktrees.push(state.toWorktree());
    state.reset();
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flush();
      continue;
    }
    const [keyword, ...rest] = line.split(" ");
    const remainder = rest.join(" ").trim();

    switch (keyword) {
      case "worktree": {
        // A new worktree entry starts. Flush existing if needed.
        if (state.path !== undefined) {
          flush();
        }
        state.reset();
        state.path = remainder;
        break;
      }
      case "HEAD": {
        state.head = remainder;
        break;
      }
      case "branch": {
        state.branch = remainder.replace("refs/heads/", "");
        break;
      }
      case "bare": {
        state.bare = true;
        break;
      }
      case "detached": {
        state.detached = true;
        break;
      }
      case "locked": {
        state.lockedReason = trimOrUndefined(remainder);
        break;
      }
      case "prunable": {
        state.prunableReason = trimOrUndefined(remainder);
        break;
      }
      default: {
        // Ignore unknown keywords but keep parsing to remain forward compatible
        break;
      }
    }
  }

  flush();

  return worktrees;
};
