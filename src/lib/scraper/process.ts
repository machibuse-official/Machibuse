import { createServerSupabaseClient } from "@/lib/supabase-server";
import { sendNotificationEmail } from "@/lib/email";
import { getEmailSubject, getEmailBody } from "@/lib/email-templates";
import type { ScrapedListing } from "./types";

interface ProcessResult {
  created: number;
  updated: number;
  skipped: number;
  notifications_created: number;
  emails_sent: number;
  images_fetched: number;
}

const NOTIFICATION_TYPE_SETTING_MAP: Record<string, string> = {
  new_listing: "notify_new_listing",
  price_change: "notify_price_change",
  ended: "notify_ended",
  relisted: "notify_relisted",
};

/**
 * スクレイプしたリスティングをDB登録し、差分があれば通知を生成してメール送信する
 */
export async function processScrapedListingsWithNotifications(
  listings: ScrapedListing[]
): Promise<ProcessResult> {
  const supabase = await createServerSupabaseClient();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let notificationsCreated = 0;
  let emailsSent = 0;
  let imagesFetched = 0;

  // メール送信用の通知設定を事前取得
  let allSettings: Record<string, unknown>[] | null = null;
  try {
    const { data } = await supabase.from("notification_settings").select("*");
    allSettings = data;
  } catch {
    // テーブル未作成の場合
  }

  // ウォッチリストから監視ユーザーを取得
  const { data: allWatchlists } = await supabase
    .from("user_watchlists")
    .select("user_id, target_mansion_id")
    .eq("is_active", true)
    .not("target_mansion_id", "is", null);

  // mansion_id -> user_ids マップ
  const watchersByMansion = new Map<string, string[]>();
  for (const w of allWatchlists || []) {
    if (!w.target_mansion_id) continue;
    const users = watchersByMansion.get(w.target_mansion_id) || [];
    users.push(w.user_id);
    watchersByMansion.set(w.target_mansion_id, users);
  }

  for (const listing of listings) {
    try {
      // 1. 建物を名前で検索
      const { data: existingMansions } = await supabase
        .from("mansions")
        .select("id, name")
        .ilike("name", `%${listing.mansion_name}%`)
        .limit(1);

      if (!existingMansions || existingMansions.length === 0) {
        skipped++;
        continue;
      }

      const mansionId = existingMansions[0].id;

      // 2. 間取りタイプを検索/作成
      const { data: existingUnits } = await supabase
        .from("units")
        .select("id")
        .eq("mansion_id", mansionId)
        .eq("layout_type", listing.layout_type)
        .eq("size_sqm", listing.size_sqm)
        .limit(1);

      let unitId: string;
      if (existingUnits && existingUnits.length > 0) {
        unitId = existingUnits[0].id;
      } else {
        const { data: newUnit, error: unitError } = await supabase
          .from("units")
          .insert({
            mansion_id: mansionId,
            layout_type: listing.layout_type,
            size_sqm: listing.size_sqm,
            floor_range: listing.floor ? `${listing.floor}F` : null,
          })
          .select("id")
          .single();

        if (unitError || !newUnit) {
          skipped++;
          continue;
        }
        unitId = newUnit.id;
      }

      // 3. 既存のリスティングをsource_urlで確認
      const { data: existingListings } = await supabase
        .from("listings")
        .select("id, current_rent, status")
        .eq("unit_id", unitId)
        .eq("source_url", listing.source_url)
        .limit(1);

      if (existingListings && existingListings.length > 0) {
        const existing = existingListings[0];

        if (existing.current_rent !== listing.rent) {
          // 賃料変更
          await supabase
            .from("listings")
            .update({
              current_rent: listing.rent,
              management_fee: listing.management_fee,
              scraped_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          const sent = await createNotificationAndEmail({
            supabase,
            mansionId,
            type: "price_change",
            title: `賃料変更: ${listing.mansion_name}`,
            message: `${listing.layout_type} ${listing.size_sqm}㎡ の賃料が ${(existing.current_rent / 10000).toFixed(1)}万円 → ${(listing.rent / 10000).toFixed(1)}万円 に変更されました`,
            listingId: existing.id,
            watchersByMansion,
            allSettings,
          });
          notificationsCreated += sent.notifications;
          emailsSent += sent.emails;
          updated++;
        } else if (existing.status === "ended") {
          // 再掲載
          await supabase
            .from("listings")
            .update({
              status: "active",
              scraped_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          const sent = await createNotificationAndEmail({
            supabase,
            mansionId,
            type: "relisted",
            title: `再掲載: ${listing.mansion_name}`,
            message: `${listing.layout_type} ${listing.size_sqm}㎡ が再掲載されました（${(listing.rent / 10000).toFixed(1)}万円）`,
            listingId: existing.id,
            watchersByMansion,
            allSettings,
          });
          notificationsCreated += sent.notifications;
          emailsSent += sent.emails;
          updated++;
        } else {
          // scraped_atだけ更新
          await supabase
            .from("listings")
            .update({ scraped_at: new Date().toISOString() })
            .eq("id", existing.id);
          skipped++;
        }
      } else {
        // 4. 新規リスティング作成
        const { data: newListing } = await supabase
          .from("listings")
          .insert({
            unit_id: unitId,
            status: "active",
            current_rent: listing.rent,
            management_fee: listing.management_fee,
            floor: listing.floor,
            source_site: listing.source_site,
            source_url: listing.source_url,
            deposit: listing.deposit,
            key_money: listing.key_money,
            move_in_date: listing.move_in_date,
            interior_features: listing.interior_features,
            building_features: listing.building_features,
            detected_at: new Date().toISOString(),
            scraped_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (newListing) {
          // 画像保存
          if (listing.images && listing.images.length > 0) {
            const imageRows = listing.images.map((img, index) => ({
              listing_id: newListing.id,
              unit_id: unitId,
              image_url: img.url,
              image_type: img.type,
              caption: img.caption,
              sort_order: index,
            }));
            try {
              await supabase.from("property_images").insert(imageRows);
            } catch {
              // property_imagesテーブル未作成の場合
            }
          }

          const sent = await createNotificationAndEmail({
            supabase,
            mansionId,
            type: "new_listing",
            title: `新着: ${listing.mansion_name}`,
            message: `${listing.layout_type} ${listing.size_sqm}㎡ ${listing.floor ? listing.floor + "F" : ""} が ${(listing.rent / 10000).toFixed(1)}万円 で掲載されました`,
            listingId: newListing.id,
            watchersByMansion,
            allSettings,
          });
          notificationsCreated += sent.notifications;
          emailsSent += sent.emails;
          created++;
        }
      }
    } catch (error) {
      console.error("[process] リスティング処理エラー:", error);
      skipped++;
    }
  }

  return {
    created,
    updated,
    skipped,
    notifications_created: notificationsCreated,
    emails_sent: emailsSent,
    images_fetched: imagesFetched,
  };
}

/**
 * 通知レコード作成 & 対象ユーザーにメール送信
 */
async function createNotificationAndEmail({
  supabase,
  mansionId,
  type,
  title,
  message,
  listingId,
  watchersByMansion,
  allSettings,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  mansionId: string;
  type: string;
  title: string;
  message: string;
  listingId: string;
  watchersByMansion: Map<string, string[]>;
  allSettings: Record<string, unknown>[] | null;
}): Promise<{ notifications: number; emails: number }> {
  const watchers = watchersByMansion.get(mansionId) || [];
  let notifications = 0;
  let emails = 0;

  for (const userId of watchers) {
    // 通知レコード作成
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      listing_id: listingId,
      is_read: false,
    });

    if (notifError) {
      console.error(`[process] 通知作成エラー: ${notifError.message}`);
      continue;
    }
    notifications++;

    // メール送信チェック
    if (!allSettings) continue;

    const userSettings = allSettings.find((s) => s.user_id === userId);
    if (!userSettings) continue;
    if (!userSettings.email_enabled || !userSettings.email_address) continue;

    const typeSettingKey = NOTIFICATION_TYPE_SETTING_MAP[type];
    if (typeSettingKey && typeSettingKey in userSettings && !userSettings[typeSettingKey]) continue;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://machibuse.vercel.app";
    const listingUrl = `${baseUrl}/listings/${listingId}`;

    const subject = getEmailSubject(type, title);
    const body = getEmailBody(type, title, message, listingUrl);

    const result = await sendNotificationEmail(
      userSettings.email_address as string,
      subject,
      body
    );

    if (result.success) emails++;
  }

  // user_idなしの通知（未ログインユーザー向け）
  if (watchers.length === 0) {
    await supabase.from("notifications").insert({
      type,
      title,
      message,
      listing_id: listingId,
      is_read: false,
    }).catch(() => {});
    notifications++;
  }

  return { notifications, emails };
}
