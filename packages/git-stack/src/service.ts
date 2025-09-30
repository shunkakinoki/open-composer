import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  checkoutNewBranch,
  deleteBranch,
  type GitCommandError,
  GitLive,
  getCurrentBranch,
  getLastCommitMessage,
  checkout as gitCheckout,
} from "@open-composer/git";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export interface StackNode {
  readonly name: string;
  readonly parent?: string;
}

export interface StackSettings {
  readonly remote: string;
}

export interface StackState {
  readonly nodes: Record<string, StackNode>;
  readonly settings: StackSettings;
}

export interface StackStatus {
  readonly currentBranch: string;
  readonly parent?: string;
  readonly children: ReadonlyArray<string>;
}

export interface CreateBranchInput {
  readonly name: string;
  readonly base?: string;
}

export interface ConfigInput {
  readonly remote: string;
}

export interface GitStackService {
  readonly list: Effect.Effect<ReadonlyArray<StackNode>>;
  readonly log: Effect.Effect<ReadonlyArray<string>>;
  readonly status: Effect.Effect<StackStatus, GitCommandError>;
  readonly create: (
    input: CreateBranchInput,
  ) => Effect.Effect<{ branch: string; base: string }, GitCommandError>;
  readonly track: (branch: string, parent: string) => Effect.Effect<void>;
  readonly untrack: (branch: string) => Effect.Effect<void>;
  readonly remove: (
    branch: string,
    force?: boolean,
  ) => Effect.Effect<void, GitCommandError>;
  readonly checkout: (branch: string) => Effect.Effect<void, GitCommandError>;
  readonly sync: Effect.Effect<ReadonlyArray<string>>;
  readonly submit: Effect.Effect<ReadonlyArray<string>, GitCommandError>;
  readonly restack: Effect.Effect<ReadonlyArray<string>>;
  readonly config: (input: ConfigInput) => Effect.Effect<void>;
}

export const GitStack =
  Context.GenericTag<GitStackService>("git-stack/service");

const defaultState = (): StackState => ({
  nodes: {},
  settings: {
    remote: "origin",
  },
});

const loadState = (statePath: string): Effect.Effect<StackState> =>
  Effect.tryPromise({
    try: async () => {
      const content = await readFile(statePath, "utf8");
      return JSON.parse(content) as StackState;
    },
    catch: (cause) => cause,
  }).pipe(Effect.catchAll(() => Effect.succeed(defaultState())));

const saveState = (statePath: string, state: StackState): Effect.Effect<void> =>
  Effect.tryPromise({
    try: async () => {
      await mkdir(path.dirname(statePath), { recursive: true });
      await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
    },
    catch: (cause) => {
      throw new Error(`Failed to persist git stack state: ${cause}`);
    },
  });

const extractPRNumber = (commitMessage: string): string | undefined => {
  // Look for patterns like #12345 or PR #12345 in commit messages
  const match = commitMessage.match(/#(\d+)/);
  return match ? match[1] : undefined;
};

const getBranchPRInfo = (
  cwd: string,
  branch: string,
): Effect.Effect<{ title: string; prNumber?: string }, GitCommandError> =>
  Effect.gen(function* () {
    const commitMessage = yield* getLastCommitMessage(branch, { cwd });
    const prNumber = extractPRNumber(commitMessage);
    return {
      title: commitMessage,
      prNumber,
    };
  });

const updateNodeParent = (
  state: StackState,
  branch: string,
  parent: string | undefined,
): StackState => {
  const _existing = state.nodes[branch] ?? { name: branch };
  return {
    ...state,
    nodes: {
      ...state.nodes,
      [branch]: {
        name: branch,
        parent,
      },
    },
  } satisfies StackState;
};

const removeNode = (state: StackState, branch: string): StackState => {
  const { [branch]: _, ...rest } = state.nodes;
  const updated = Object.fromEntries(
    Object.entries(rest).map(([name, node]) =>
      node.parent === branch
        ? ([name, { ...node, parent: undefined }] satisfies [string, StackNode])
        : ([name, node] satisfies [string, StackNode]),
    ),
  );
  return {
    ...state,
    nodes: updated,
  } satisfies StackState;
};

const renderLog = (state: StackState): ReadonlyArray<string> => {
  const entries = Object.values(state.nodes);
  if (entries.length === 0) {
    return [
      "No tracked stack branches. Use `open-composer stack track` to begin.",
    ];
  }

  const children = new Map<string, string[]>();
  for (const node of entries) {
    if (!node.parent) continue;
    const list = children.get(node.parent) ?? [];
    list.push(node.name);
    children.set(node.parent, list);
  }

  const roots = entries.filter((node) => !node.parent);
  const ordered = roots.length > 0 ? roots : entries;

  const lines: string[] = [];

  const visit = (name: string, depth: number) => {
    const prefix = depth === 0 ? "" : `${"  ".repeat(depth - 1)}└─`;
    lines.push(`${prefix}${name}`);
    const kids = children.get(name) ?? [];
    for (const child of kids) {
      visit(child, depth + 1);
    }
  };

  for (const node of ordered) {
    visit(node.name, 0);
  }

  return lines;
};

const renderStackedPRs = (
  cwd: string,
  state: StackState,
  currentBranch: string,
): Effect.Effect<ReadonlyArray<string>, GitCommandError> =>
  Effect.gen(function* () {
    const entries = Object.values(state.nodes);
    if (entries.length === 0) {
      return ["No tracked stack branches to submit."] as ReadonlyArray<string>;
    }

    const children = new Map<string, string[]>();
    for (const node of entries) {
      if (!node.parent) continue;
      const list = children.get(node.parent) ?? [];
      list.push(node.name);
      children.set(node.parent, list);
    }

    const roots = entries.filter((node) => !node.parent);
    const ordered = roots.length > 0 ? roots : entries;

    const lines: string[] = [];

    const processBranch = (
      name: string,
      depth: number,
    ): Effect.Effect<void, GitCommandError> =>
      Effect.gen(function* () {
        const prInfo = yield* getBranchPRInfo(cwd, name);
        const isCurrentBranch = name === currentBranch;

        let line = "";
        if (depth > 0) {
          line = `${"  ".repeat(depth - 1)}└─ `;
        }

        // Add branch title and PR number if available
        if (prInfo.prNumber) {
          line += `${prInfo.title} #${prInfo.prNumber} Open Composer`;
        } else {
          line += `${prInfo.title}`;
        }

        // Add current branch indicator
        if (isCurrentBranch) {
          line += " 👈 (View in Open Composer)";
        }

        lines.push(line);

        const kids = children.get(name) ?? [];
        for (const child of kids) {
          yield* processBranch(child, depth + 1);
        }
      });

    for (const node of ordered) {
      yield* processBranch(node.name, 0);
    }

    return lines;
  });

const makeService = (): GitStackService => {
  const getCwd = () => process.cwd();
  const statePath = path.join(getCwd(), ".git", "open-composer-stack.json");

  const withState = <A>(
    f: (state: StackState) => Effect.Effect<[A, StackState]>,
  ): Effect.Effect<A> =>
    loadState(statePath).pipe(
      Effect.flatMap((state) =>
        f(state).pipe(
          Effect.flatMap(([value, next]) =>
            saveState(statePath, next).pipe(Effect.map(() => value)),
          ),
        ),
      ),
    );

  const readOnlyState = <A>(f: (state: StackState) => A): Effect.Effect<A> =>
    loadState(statePath).pipe(Effect.map(f));

  return {
    list: readOnlyState((state) => Object.values(state.nodes)),

    log: readOnlyState((state) => renderLog(state)),

    status: loadState(statePath).pipe(
      Effect.zip(getCurrentBranch({ cwd: getCwd() })),
      Effect.map(([state, currentBranch]) => {
        const node = state.nodes[currentBranch];
        const children = Object.values(state.nodes)
          .filter((candidate) => candidate.parent === currentBranch)
          .map((candidate) => candidate.name);
        return {
          currentBranch,
          parent: node?.parent,
          children,
        } satisfies StackStatus;
      }),
    ),

    create: ({ name, base }) =>
      Effect.gen(function* () {
        const baseBranch = base ?? (yield* getCurrentBranch({ cwd: getCwd() }));
        yield* checkoutNewBranch(name, baseBranch, { cwd: getCwd() });
        yield* withState((state) =>
          Effect.succeed([
            { branch: name, base: baseBranch },
            updateNodeParent(state, name, baseBranch),
          ]),
        );
        return { branch: name, base: baseBranch };
      }),

    track: (branch, parent) =>
      withState((state) =>
        Effect.succeed([void 0, updateNodeParent(state, branch, parent)]),
      ),

    untrack: (branch) =>
      withState((state) =>
        Effect.succeed([void 0, updateNodeParent(state, branch, undefined)]),
      ),

    remove: (branch, force = false) =>
      Effect.gen(function* () {
        yield* deleteBranch(branch, force, { cwd: getCwd() });
        yield* withState((state) =>
          Effect.succeed([void 0, removeNode(state, branch)]),
        );
      }),

    checkout: (branch) =>
      gitCheckout(branch, { cwd: getCwd() }).pipe(Effect.asVoid),

    sync: readOnlyState((state) => {
      const branches = Object.keys(state.nodes);
      if (branches.length === 0) {
        return ["No tracked stack branches to sync."];
      }
      return ["Sync is currently a no-op. Push branches manually if needed."];
    }),

    submit: Effect.gen(function* () {
      const state = yield* loadState(statePath);
      const currentBranch = yield* getCurrentBranch({ cwd: getCwd() });
      return yield* renderStackedPRs(getCwd(), state, currentBranch);
    }),

    restack: readOnlyState((state) => {
      const branches = Object.keys(state.nodes);
      if (branches.length === 0) {
        return ["No tracked branches to restack."];
      }
      return [
        "Restack is currently informational only. Ensure your branches are rebased manually.",
      ];
    }),

    config: ({ remote }) =>
      withState((state) =>
        Effect.succeed([
          void 0,
          {
            ...state,
            settings: {
              remote,
            },
          } satisfies StackState,
        ]),
      ),
  } satisfies GitStackService;
};

export const GitStackLive = Layer.effect(
  GitStack,
  Effect.sync(() => makeService()),
);

export const GitStackWithGitLive = Layer.merge(GitStackLive, GitLive);

export const provideGitStack = <A>(effect: Effect.Effect<A>) =>
  effect.pipe(Effect.provide(GitStackWithGitLive));
