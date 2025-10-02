import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ReleaseInfo {
  readonly tagName: string;
  readonly version: string;
  readonly name: string;
  readonly body: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly assets: ReadonlyArray<ReleaseAsset>;
}

export interface ReleaseAsset {
  readonly name: string;
  readonly url: string;
  readonly downloadUrl: string;
  readonly size: number;
  readonly contentType: string;
}

export interface GitHubReleasesError {
  readonly _tag: "GitHubReleasesError";
  readonly message: string;
  readonly cause: unknown;
  readonly statusCode?: number | undefined;
}

const makeGitHubReleasesError = (params: {
  readonly message: string;
  readonly cause: unknown;
  readonly statusCode?: number | undefined;
}): GitHubReleasesError => {
  const result: GitHubReleasesError = {
    _tag: "GitHubReleasesError",
    message: params.message,
    cause: params.cause,
  };
  if (params.statusCode !== undefined) {
    return { ...result, statusCode: params.statusCode };
  }
  return result;
};

export interface GitHubReleasesConfig {
  readonly owner: string;
  readonly repo: string;
  readonly packageName?: string;
}

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

export interface GitHubReleasesService {
  readonly getLatestRelease: () => Effect.Effect<
    ReleaseInfo,
    GitHubReleasesError
  >;
  readonly getLatestVersion: () => Effect.Effect<string, GitHubReleasesError>;
  readonly getReleaseByTag: (
    tag: string,
  ) => Effect.Effect<ReleaseInfo, GitHubReleasesError>;
  readonly listReleases: (params?: {
    readonly page?: number;
    readonly perPage?: number;
  }) => Effect.Effect<ReadonlyArray<ReleaseInfo>, GitHubReleasesError>;
}

export const GitHubReleases = Context.GenericTag<GitHubReleasesService>(
  "@open-composer/git-releases/GitHubReleases",
);

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

function parseReleaseInfo(
  data: {
    tag_name: string;
    name: string;
    body: string;
    html_url: string;
    published_at: string;
    assets: Array<{
      name: string;
      url: string;
      browser_download_url: string;
      size: number;
      content_type: string;
    }>;
  },
  packageName?: string,
): ReleaseInfo {
  const tagName = data.tag_name;
  const version = packageName
    ? tagName.replace(`${packageName}@`, "")
    : tagName;

  return {
    tagName,
    version,
    name: data.name,
    body: data.body,
    url: data.html_url,
    publishedAt: data.published_at,
    assets: data.assets.map((asset) => ({
      name: asset.name,
      url: asset.url,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      contentType: asset.content_type,
    })),
  };
}

export const makeGitHubReleasesLive = (
  config: GitHubReleasesConfig,
): Layer.Layer<GitHubReleasesService> =>
  Layer.succeed(
    GitHubReleases,
    GitHubReleases.of({
      getLatestRelease: () =>
        Effect.tryPromise({
          try: async () => {
            const url = `https://api.github.com/repos/${config.owner}/${config.repo}/releases/latest`;
            const response = await fetch(url, {
              headers: {
                Accept: "application/vnd.github.v3+json",
              },
            });

            if (!response.ok) {
              throw {
                statusCode: response.status,
                message: `Failed to fetch latest release: ${response.statusText}`,
              };
            }

            const data = (await response.json()) as {
              tag_name: string;
              name: string;
              body: string;
              html_url: string;
              published_at: string;
              assets: Array<{
                name: string;
                url: string;
                browser_download_url: string;
                size: number;
                content_type: string;
              }>;
            };
            return parseReleaseInfo(data, config.packageName);
          },
          catch: (error) => {
            const err = error as { statusCode?: number; message?: string };
            return makeGitHubReleasesError({
              message:
                err.message ||
                `Failed to fetch latest release: ${String(error)}`,
              cause: error,
              statusCode: err.statusCode ?? undefined,
            });
          },
        }),

      getLatestVersion: () =>
        Effect.tryPromise({
          try: async () => {
            const url = `https://api.github.com/repos/${config.owner}/${config.repo}/releases/latest`;
            const response = await fetch(url, {
              headers: {
                Accept: "application/vnd.github.v3+json",
              },
            });

            if (!response.ok) {
              throw {
                statusCode: response.status,
                message: `Failed to fetch latest release: ${response.statusText}`,
              };
            }

            const data = (await response.json()) as {
              tag_name: string;
            };
            const tagName = data.tag_name;
            const version = config.packageName
              ? tagName.replace(`${config.packageName}@`, "")
              : tagName;
            return version;
          },
          catch: (error) => {
            const err = error as { statusCode?: number; message?: string };
            return makeGitHubReleasesError({
              message:
                err.message ||
                `Failed to fetch latest version: ${String(error)}`,
              cause: error,
              statusCode:
                err.statusCode !== undefined ? err.statusCode : undefined,
            });
          },
        }),

      getReleaseByTag: (tag: string) =>
        Effect.tryPromise({
          try: async () => {
            const url = `https://api.github.com/repos/${config.owner}/${config.repo}/releases/tags/${tag}`;
            const response = await fetch(url, {
              headers: {
                Accept: "application/vnd.github.v3+json",
              },
            });

            if (!response.ok) {
              throw {
                statusCode: response.status,
                message: `Failed to fetch release for tag ${tag}: ${response.statusText}`,
              };
            }

            const data = (await response.json()) as {
              tag_name: string;
              name: string;
              body: string;
              html_url: string;
              published_at: string;
              assets: Array<{
                name: string;
                url: string;
                browser_download_url: string;
                size: number;
                content_type: string;
              }>;
            };
            return parseReleaseInfo(data, config.packageName);
          },
          catch: (error) => {
            const err = error as { statusCode?: number; message?: string };
            return makeGitHubReleasesError({
              message:
                err.message ||
                `Failed to fetch release for tag ${tag}: ${String(error)}`,
              cause: error,
              statusCode: err.statusCode ?? undefined,
            });
          },
        }),

      listReleases: (params) =>
        Effect.tryPromise({
          try: async () => {
            const page = params?.page || 1;
            const perPage = params?.perPage || 30;
            const url = `https://api.github.com/repos/${config.owner}/${config.repo}/releases?page=${page}&per_page=${perPage}`;
            const response = await fetch(url, {
              headers: {
                Accept: "application/vnd.github.v3+json",
              },
            });

            if (!response.ok) {
              throw {
                statusCode: response.status,
                message: `Failed to list releases: ${response.statusText}`,
              };
            }

            const data = (await response.json()) as Array<{
              tag_name: string;
              name: string;
              body: string;
              html_url: string;
              published_at: string;
              assets: Array<{
                name: string;
                url: string;
                browser_download_url: string;
                size: number;
                content_type: string;
              }>;
            }>;
            return data.map((item) =>
              parseReleaseInfo(item, config.packageName),
            );
          },
          catch: (error) => {
            const err = error as { statusCode?: number; message?: string };
            return makeGitHubReleasesError({
              message:
                err.message || `Failed to list releases: ${String(error)}`,
              cause: error,
              statusCode: err.statusCode ?? undefined,
            });
          },
        }),
    }),
  );
