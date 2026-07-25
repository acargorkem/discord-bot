import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import Settings from "./Settings.svelte";

vi.mock("../api", () => ({
  fetchSettings: vi.fn(async () => ({ defaultVolume: 80 })),
  updateSettings: vi.fn(async () => {}),
}));

test("mevcut varsayılan sesi gösterir", async () => {
  render(Settings);
  await expect.element(page.getByText("80")).toBeInTheDocument();
});

test("kaydet butonu updateSettings çağırır", async () => {
  render(Settings);
  await expect.element(page.getByText("80")).toBeInTheDocument();
  await page.getByRole("button", { name: "Kaydet" }).click();
  expect(api.updateSettings).toHaveBeenCalledWith(80);
});
