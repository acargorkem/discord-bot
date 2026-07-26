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
  addToPlaylist: vi.fn(async () => ({ ok: true, message: "eklendi" })),
  removeFromPlaylist: vi.fn(async () => {}),
  createPlaylist: vi.fn(async () => ({ ok: true, message: "oluşturuldu" })),
  renamePlaylist: vi.fn(async () => ({ ok: true, message: "adlandırıldı" })),
  movePlaylistTrack: vi.fn(async () => {}),
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

test("playlist açılınca parçaları gösterir", async () => {
  render(Playlists);
  await page.getByRole("button", { name: "Aç/kapat: favoriler" }).click();
  await expect.element(page.getByText("Silvera")).toBeInTheDocument();
});

test("yeni boş playlist oluşturur", async () => {
  render(Playlists);
  await page.getByPlaceholder("Yeni playlist adı…").fill("Roadtrip");
  await page.getByRole("button", { name: "Oluştur" }).click();
  expect(api.createPlaylist).toHaveBeenCalledWith("Roadtrip");
});

test("sil butonu onay modalı açar", async () => {
  render(Playlists);
  await page.getByRole("button", { name: "Sil: favoriler" }).click();
  await expect.element(page.getByText("Playlist'i sil?")).toBeInTheDocument();
});
