import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import Playlists from "./Playlists.svelte";

vi.mock("../api", () => ({
  fetchPlaylists: vi.fn(async () => [{ name: "favoriler", trackCount: 2 }]),
  savePlaylist: vi.fn(async () => {}),
  loadPlaylist: vi.fn(async () => {}),
  deletePlaylist: vi.fn(async () => {}),
}));

test("kayıtlı playlistleri listeler", async () => {
  render(Playlists);
  await expect.element(page.getByText("favoriler")).toBeInTheDocument();
});

test("yükle butonu loadPlaylist çağırır", async () => {
  render(Playlists);
  await page.getByRole("button", { name: "Yükle: favoriler" }).click();
  expect(api.loadPlaylist).toHaveBeenCalledWith("favoriler");
});
