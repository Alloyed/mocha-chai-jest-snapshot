import chai from "chai";
import { Runnable, Context } from "mocha";
import {
  SnapshotState,
  SnapshotStateType,
  SnapshotResolver,
} from "jest-snapshot";

import {
  SnapshotSummary,
  packSnapshotState,
  addSnapshotResult,
  makeEmptySnapshotSummary,
} from "./utils/jest-test-result-helper";
import { getSnapshotSummaryOutput } from "./utils/jest-reporters-lite";
import { snapshotOptions } from "./helper";
import { Config } from "@jest/types";

const { expect } = chai;

class SnapshotManager {
  snapshotState: SnapshotStateType | null = null;
  snapshotSummary: SnapshotSummary = makeEmptySnapshotSummary(snapshotOptions);
  context: Runnable | Context | null = null;
  testFile = "";
  snapshotResolver: SnapshotResolver | null;
  rootDir: Config.Path;

  constructor({
    rootDir,
    snapshotResolver = null,
  }: {
    rootDir: Config.Path;
    snapshotResolver?: SnapshotResolver | null;
  }) {
    this.rootDir = rootDir;
    this.snapshotResolver = snapshotResolver;
  }

  onFileChanged(): void {
    if (!this.context) return;

    if (this.snapshotState !== null) this.saveSnap();

    this.testFile = this.context.file;
    this.snapshotState = new SnapshotState(
      this.snapshotResolver.resolveSnapshotPath(this.testFile),
      snapshotOptions
    );
  }

  setContext(context: Runnable | Context): void {
    if (!context.title || !context.file) return;

    this.context = context;
    if (this.testFile !== context.file) this.onFileChanged();
  }

  assert(received: unknown, message: string): void {
    if (!this.snapshotState || !this.context) return;

    const { actual, expected, key, pass } = this.snapshotState.match({
      testName: this.context.fullTitle(),
      received,
      isInline: false,
    });
    if (!pass) {
      expect(actual.trim()).equals(
        expected ? expected.trim() : "",
        message || `Snapshot name: \`${key}\``
      );
    }
  }

  saveSnap(): void {
    if (!this.testFile || !this.snapshotState) return;

    const packedSnapshotState = packSnapshotState(this.snapshotState);
    addSnapshotResult(this.snapshotSummary, packedSnapshotState, this.testFile);

    this.testFile = "";
    this.snapshotState = null;
  }

  report(): void {
    const outputs = getSnapshotSummaryOutput(
      this.rootDir,
      this.snapshotSummary
    );
    if (outputs.length > 1) console.log("\n" + outputs.join("\n"));
  }
}

export default SnapshotManager;
