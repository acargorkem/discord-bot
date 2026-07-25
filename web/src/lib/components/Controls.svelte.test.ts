import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import type { NowPlaying } from "../api";
import { control } from "../api";
import Controls from "./Controls.svelte";

vi.mock("../api", () => ({ control: vi.fn() }));

const track: NowPlaying = {
  title: "X",
  author: "Y",
  uri: null,
  duration: 100_000,
  position: 0,
  isStream: false,
  artworkUrl: null,
  paused: false,
  volume: 100,
  repeatMode: "off",
};

test("duraklat butonu control('pause') çağırır", async () => {
  render(Controls, { track });
  await page.getByRole("button", { name: "Duraklat" }).click();
  expect(control).toHaveBeenCalledWith("pause");
});

test("çalan yokken kontroller devre dışı", async () => {
  render(Controls, { track: null });
  await expect
    .element(page.getByRole("button", { name: "Duraklat" }))
    .toBeDisabled();
});
