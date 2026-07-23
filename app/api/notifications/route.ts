import { NextRequest } from "next/server";
import { createClient } from "@/lib/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { NotificationsService } from "@/lib/services/notifications.service";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    const notifications = await NotificationsService.listForUser(
      supabase,
      user.id,
      30,
    );
    return ok(notifications);
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return serverError();
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json().catch(() => ({}));
    const notificationId = body?.id as string | undefined;

    if (notificationId) {
      await NotificationsService.markAsRead(supabase, notificationId, user.id);
    } else {
      await NotificationsService.markAllAsRead(supabase, user.id);
    }

    return ok({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/notifications]", err);
    return serverError();
  }
}
