import { expect, test } from "@playwright/test";
import { APP_URL, seedTheme } from "./helpers";

test("sheet changes reset the caret and active line", async ({ page }) => {
  await seedTheme(page);
  await page.goto(APP_URL);
  const editor = page.locator("textarea");
  await editor.fill(Array.from({ length: 14 }, (_, i) => `line${i + 1} = ${i + 1}`).join("\n"));
  await editor.press("Control+Home");
  for (let i = 0; i < 11; i++) await editor.press("ArrowDown");
  const activeLine = page.locator(".nm-active-line");
  await expect(activeLine).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 412)");
  await page.getByRole("button", { name: /new/i }).first().click();
  await expect(editor).toHaveValue("");
  await expect(activeLine).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 16)");
  await expect.poll(() => editor.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(0);
  await page.locator(".group").filter({ has: page.locator('button[aria-label="Sheet actions"]') }).last().click();
  await expect(editor).toHaveValue(/line14/);
  await expect(activeLine).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 16)");
  await expect.poll(() => editor.evaluate((el: HTMLTextAreaElement) => el.selectionStart)).toBe(0);
});
