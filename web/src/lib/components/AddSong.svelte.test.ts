import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import AddSong from "./AddSong.svelte";

vi.mock("../api", () => ({
  playTrack: vi.fn(async () => ({ ok: true, message: "Kuyruğa eklendi: Test" })),
}));

test("şarkı ekler ve sonuç mesajını gösterir", async () => {
  render(AddSong);
  await page.getByRole("textbox", { name: "Şarkı adı veya link" }).fill("daft punk");
  await page.getByRole("button", { name: "Ekle" }).click();
  expect(api.playTrack).toHaveBeenCalledWith("daft punk");
  await expect
    .element(page.getByText("Kuyruğa eklendi: Test"))
    .toBeInTheDocument();
});

test("boş sorguda ekle butonu pasiftir", async () => {
  render(AddSong);
  await expect
    .element(page.getByRole("button", { name: "Ekle" }))
    .toBeDisabled();
});
