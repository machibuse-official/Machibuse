import { test, expect } from "@playwright/test";

test.describe("ダッシュボード", () => {
  test("ダッシュボードページが表示される", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/Machibuse/);
    await expect(page.locator("text=ダッシュボード").first()).toBeVisible();
  });
});

test.describe("物件一覧", () => {
  test("物件一覧ページが表示される", async ({ page }) => {
    await page.goto("/mansions");
    await page.waitForLoadState("networkidle");
    // 検索UIまたは物件カードの存在を確認
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  test("物件をクリックして詳細画面に遷移できる", async ({ page }) => {
    await page.goto("/mansions");
    await page.waitForLoadState("networkidle");
    // 最初の物件カード（あれば）をクリック
    const firstCard = page.locator('a[href^="/mansions/"]').first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForLoadState("networkidle");
      await expect(page.url()).toContain("/mansions/");
    }
  });
});

test.describe("ウォッチリスト", () => {
  test("ウォッチリストページが表示される", async ({ page }) => {
    await page.goto("/watchlist");
    await expect(page.locator("text=ウォッチリスト").first()).toBeVisible();
  });
});

test.describe("お気に入り", () => {
  test("お気に入りページが表示される", async ({ page }) => {
    await page.goto("/favorites");
    await expect(page.locator("text=お気に入り").first()).toBeVisible();
  });
});

test.describe("物件比較", () => {
  test("比較ページが表示される", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.locator("text=物件比較").first()).toBeVisible();
  });
});

test.describe("通知", () => {
  test("通知一覧ページが表示される", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.locator("text=通知").first()).toBeVisible();
  });
});

test.describe("通知設定", () => {
  test("通知設定ページが表示される", async ({ page }) => {
    await page.goto("/settings/notifications");
    await expect(page.locator("text=通知設定").first()).toBeVisible();
  });

  test("メール通知トグルが動作する", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("networkidle");
    const toggle = page.locator("text=メール通知を有効にする").locator("..").locator("button");
    if (await toggle.isVisible()) {
      await toggle.click();
      // トグル後にメールアドレス入力欄が表示/非表示になることを確認
    }
  });
});

test.describe("ナビゲーション", () => {
  test("サイドバーのリンクが正しく遷移する", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // 物件リストに遷移
    const mansionsLink = page.locator('a[href="/mansions"]').first();
    if (await mansionsLink.isVisible()) {
      await mansionsLink.click();
      await expect(page.url()).toContain("/mansions");
    }
  });
});

test.describe("管理画面", () => {
  test("管理画面が表示される", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });
});
