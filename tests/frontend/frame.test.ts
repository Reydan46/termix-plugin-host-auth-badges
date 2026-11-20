import { describe, expect, it } from "vitest";
import { checkFrameApp, checkFrameViews } from "@termix-ssh/plugin-sdk/testing";
import manifest from "../../manifest.json";
import * as plugin from "../../src/frontend";

describe("frame", () => {
  it("activates the way a frame does", async () => {
    const { problems } = await checkFrameApp(plugin, { manifest: manifest as never });
    expect(problems).toEqual([]);
  });
  it("asks core only for what a frame may reach", async () => {
    const { refused } = await checkFrameViews(plugin, { manifest: manifest as never });
    expect(refused).toEqual([]);
  });
});
