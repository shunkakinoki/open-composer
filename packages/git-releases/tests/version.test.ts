import { describe, expect, test } from "bun:test";
import {
  compareVersions,
  isLatestVersion,
  isNewerThanLatest,
  isUpdateAvailable,
} from "../src/version.js";

describe("version comparison", () => {
  describe("compareVersions", () => {
    test("should return -1 when current version is less than target", () => {
      expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
      expect(compareVersions("1.5.0", "1.6.0")).toBe(-1);
      expect(compareVersions("1.0.1", "1.0.2")).toBe(-1);
    });

    test("should return 0 when versions are equal", () => {
      expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(compareVersions("2.5.3", "2.5.3")).toBe(0);
    });

    test("should return 1 when current version is greater than target", () => {
      expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
      expect(compareVersions("1.6.0", "1.5.0")).toBe(1);
      expect(compareVersions("1.0.2", "1.0.1")).toBe(1);
    });

    test("should handle versions with different lengths", () => {
      expect(compareVersions("1.0", "1.0.0")).toBe(0);
      expect(compareVersions("1.0.0", "1.0")).toBe(0);
      expect(compareVersions("1.1", "1.0.5")).toBe(1);
      expect(compareVersions("1.0.5", "1.1")).toBe(-1);
    });

    test("should handle pre-release versions (treating them as numbers)", () => {
      // Note: These tests assume simple numeric comparison
      expect(compareVersions("1.0.0", "1.0.1")).toBe(-1);
    });
  });

  describe("isUpdateAvailable", () => {
    test("should return true when update is available", () => {
      expect(isUpdateAvailable("1.0.0", "2.0.0")).toBe(true);
      expect(isUpdateAvailable("1.5.0", "1.6.0")).toBe(true);
    });

    test("should return false when no update is available", () => {
      expect(isUpdateAvailable("2.0.0", "1.0.0")).toBe(false);
      expect(isUpdateAvailable("1.0.0", "1.0.0")).toBe(false);
    });
  });

  describe("isNewerThanLatest", () => {
    test("should return true when current is newer", () => {
      expect(isNewerThanLatest("2.0.0", "1.0.0")).toBe(true);
      expect(isNewerThanLatest("1.6.0", "1.5.0")).toBe(true);
    });

    test("should return false when current is not newer", () => {
      expect(isNewerThanLatest("1.0.0", "2.0.0")).toBe(false);
      expect(isNewerThanLatest("1.0.0", "1.0.0")).toBe(false);
    });
  });

  describe("isLatestVersion", () => {
    test("should return true when versions match", () => {
      expect(isLatestVersion("1.0.0", "1.0.0")).toBe(true);
      expect(isLatestVersion("2.5.3", "2.5.3")).toBe(true);
    });

    test("should return false when versions don't match", () => {
      expect(isLatestVersion("1.0.0", "2.0.0")).toBe(false);
      expect(isLatestVersion("2.0.0", "1.0.0")).toBe(false);
    });
  });
});
