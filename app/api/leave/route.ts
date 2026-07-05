import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

// Called by NavbarWrapper's beforeunload handler via fetch keepalive.
// Sets is_in_lobby: false for the player so they appear offline immediately.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nickname } = body;

    if (!nickname || typeof nickname !== "string") {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    const { error } = await supabase
      .from("players")
      .update({ is_in_lobby: false })
      .ilike("nickname", nickname);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/leave]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
