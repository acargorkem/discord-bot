import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import Channels from "./Channels.svelte";

vi.mock("../api", () => ({
  fetchChannels: vi.fn(async () => ({
    channels: [{ id: "1", name: "Genel" }],
    current: "1",
  })),
  joinChannel: vi.fn(async () => {}),
  leaveChannel: vi.fn(async () => {}),
}));

test("ses kanallarını listeler", async () => {
  render(Channels, { currentChannelId: null });
  await expect.element(page.getByRole("option", { name: "Genel" })).toBeInTheDocument();
});

test("çık butonu leaveChannel çağırır", async () => {
  render(Channels, { currentChannelId: "1" });
  await page.getByRole("button", { name: "Çık" }).click();
  expect(api.leaveChannel).toHaveBeenCalled();
});
