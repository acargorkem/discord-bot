import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import Queue from "./Queue.svelte";

vi.mock("../api", () => ({
  moveQueue: vi.fn(async () => {}),
  removeFromQueue: vi.fn(async () => {}),
}));

const queue = [
  { title: "Silvera", author: "Gojira", uri: null, duration: 200000 },
  { title: "Nemesis", author: "Arch Enemy", uri: null, duration: 240000 },
];

test("kuyruktaki parçaları listeler", async () => {
  render(Queue, { queue });
  await expect
    .element(page.getByText("Nemesis", { exact: false }))
    .toBeInTheDocument();
});

test("boş kuyrukta mesaj gösterir", async () => {
  render(Queue, { queue: [] });
  await expect.element(page.getByText("Kuyruk boş.")).toBeInTheDocument();
});

test("kaldır butonu removeFromQueue çağırır", async () => {
  render(Queue, { queue });
  await page.getByRole("button", { name: "Kuyruktan kaldır: Silvera" }).click();
  expect(api.removeFromQueue).toHaveBeenCalledWith(0);
});
