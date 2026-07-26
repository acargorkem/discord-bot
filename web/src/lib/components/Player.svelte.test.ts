import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import type { NowPlaying } from "../api";
import Player from "./Player.svelte";

vi.mock("../api", () => ({
  control: vi.fn(async () => {}),
  setRepeat: vi.fn(async () => {}),
}));

const track: NowPlaying = {
  title: "Silvera",
  author: "Gojira",
  uri: "https://open.spotify.com/track/1",
  duration: 200000,
  position: 50000,
  isStream: false,
  artworkUrl: null,
  paused: false,
  volume: 80,
  repeatMode: "off",
};

test("çalan parçayı gösterir", async () => {
  render(Player, { track, shuffle: false });
  await expect.element(page.getByText("Silvera")).toBeInTheDocument();
});

test("duraklat butonu control('pause') çağırır", async () => {
  render(Player, { track, shuffle: false });
  await page.getByRole("button", { name: "Duraklat" }).click();
  expect(api.control).toHaveBeenCalledWith("pause");
});

test("karışık butonu control('shuffle') çağırır", async () => {
  render(Player, { track, shuffle: false });
  await page.getByRole("button", { name: "Karışık çalma" }).click();
  expect(api.control).toHaveBeenCalledWith("shuffle");
});
