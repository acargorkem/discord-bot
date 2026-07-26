import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test, vi } from "vitest";
import * as api from "../api";
import Access from "./Access.svelte";

vi.mock("../api", () => ({
  fetchAccess: vi.fn(async () => [
    {
      userId: "owner-1",
      username: "Owner",
      isOwner: true,
      grantedBy: null,
      grantedAt: null,
    },
  ]),
  fetchMembers: vi.fn(async () => [
    { id: "2", username: "ali", displayName: "Ali", avatarUrl: null },
  ]),
  grantAccess: vi.fn(async () => ({ ok: true, message: "Erişim verildi." })),
  revokeAccess: vi.fn(async () => {}),
}));

test("erişim listesini ve sahip rozetini gösterir", async () => {
  render(Access);
  await expect.element(page.getByText("Owner")).toBeInTheDocument();
  await expect.element(page.getByText("Sahip")).toBeInTheDocument();
});

test("yetki ver butonu grantAccess çağırır", async () => {
  render(Access);
  await page.getByRole("button", { name: "Yetki ver: Ali" }).click();
  expect(api.grantAccess).toHaveBeenCalledWith("2", "ali");
});
