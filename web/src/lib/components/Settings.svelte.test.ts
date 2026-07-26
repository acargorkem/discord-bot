import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import Settings from "./Settings.svelte";

vi.mock("../api", () => ({
  fetchSettings: vi.fn(async () => ({ defaultVolume: 80, keepPlayingAlone: false })),
  updateSettings: vi.fn(async () => {}),
}));

test("mevcut varsayılan sesi gösterir", async () => {
  render(Settings);
  await expect.element(page.getByText("80%")).toBeInTheDocument();
});

test("kaydet butonu updateSettings çağırır", async () => {
  render(Settings);
  await expect.element(page.getByText("80%")).toBeInTheDocument();
  await page.getByRole("button", { name: "Kaydet" }).click();
  expect(api.updateSettings).toHaveBeenCalledWith({
    defaultVolume: 80,
    keepPlayingAlone: false,
  });
});

test("boş kanal anahtarı updateSettings çağırır", async () => {
  render(Settings);
  await expect.element(page.getByText("80%")).toBeInTheDocument();
  // Checkbox görsel olarak gizli; sarmalayan label metnine tıklamak toggle'lar.
  await page.getByText("Boş kanalda çalmaya devam et").click();
  expect(api.updateSettings).toHaveBeenCalledWith({
    defaultVolume: 80,
    keepPlayingAlone: true,
  });
});
