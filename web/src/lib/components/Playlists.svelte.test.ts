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
  fetchPlaylistTracks: vi.fn(async () => [
    {
      position: 0,
      title: "Silvera",
      author: "Gojira",
      uri: "https://open.spotify.com/track/1",
      duration: 200000,
    },
  ]),
  addToPlaylist: vi.fn(async () => ({ ok: true, message: "1 parça eklendi." })),
  removeFromPlaylist: vi.fn(async () => {}),
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

test("playlist açılınca parçaları ve kaynak rozetini gösterir", async () => {
  render(Playlists);
  await page.getByRole("button", { name: "Aç/kapat: favoriler" }).click();
  await expect.element(page.getByText("Silvera")).toBeInTheDocument();
  await expect.element(page.getByText("Spotify")).toBeInTheDocument();
});

test("parça silme removeFromPlaylist çağırır", async () => {
  render(Playlists);
  await page.getByRole("button", { name: "Aç/kapat: favoriler" }).click();
  await page.getByRole("button", { name: "Parçayı sil: Silvera" }).click();
  expect(api.removeFromPlaylist).toHaveBeenCalledWith("favoriler", 0);
});
