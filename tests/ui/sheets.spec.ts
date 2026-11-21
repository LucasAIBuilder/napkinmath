import { expect, test } from "@playwright/test";
import { APP_URL, seedTheme } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedTheme(page);
  await page.goto(APP_URL);
});

test("collapsed sheets keep the expand control clear", async ({ page }) => {
  await page.getByRole("button", { name: "Collapse sheets" }).click();
  await expect(page.getByRole("button", { name: "Expand sheets" })).toBeVisible();
  await expect(page.getByText("My Sheets")).toHaveCount(0);
  const expand = await page.getByRole("button", { name: "Expand sheets" }).boundingBox();
  const add = await page.getByRole("button", { name: "＋" }).boundingBox();
  expect(expand?.x).toBe(add?.x);
  expect(expand?.width).toBe(add?.width);
  await page.getByRole("button", { name: "Expand sheets" }).click();
  await expect(page.getByText("My Sheets")).toBeVisible();
});

test("sheet dialogs save emoji and cancel or confirm deletion", async ({ page }) => {
  const sheet = page.locator(".group").filter({ has: page.locator('button[aria-label="Sheet actions"]') }).first();
  await sheet.hover();
  await page.getByRole("button", { name: "Sheet actions" }).first().click();
  await page.getByRole("button", { name: "Emoji", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Emoji").fill("🚀");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(sheet).toContainText("🚀");
  await sheet.hover();
  await page.getByRole("button", { name: "Sheet actions" }).first().click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).toContainText("This sheet has content.");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(sheet).toContainText("🚀");
  await sheet.hover();
  await page.getByRole("button", { name: "Sheet actions" }).first().click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".group").filter({ hasText: "🚀" })).toHaveCount(0);
});
