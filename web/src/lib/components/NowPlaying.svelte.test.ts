import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test } from "vitest";
import type { NowPlaying } from "../api";
import NowPlayingCard from "./NowPlaying.svelte";

const track: NowPlaying = {
  title: "Şarkı X",
  author: "Sanatçı Y",
  uri: null,
  duration: 100_000,
  position: 50_000,
  isStream: false,
  artworkUrl: null,
  paused: false,
  volume: 100,
  repeatMode: "off",
};

test("çalan parçanın başlık ve sanatçısını gösterir", async () => {
  render(NowPlayingCard, { track });
  await expect.element(page.getByText("Şarkı X")).toBeInTheDocument();
  await expect.element(page.getByText("Sanatçı Y")).toBeInTheDocument();
});

test("boşta bilgilendirme mesajı gösterir", async () => {
  render(NowPlayingCard, { track: null });
  await expect
    .element(page.getByText("Şu an çalan bir şey yok."))
    .toBeInTheDocument();
});
