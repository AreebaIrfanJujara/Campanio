import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase service key not configured" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check if user already exists
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      // Auto-confirm existing user
      const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { email_confirm: true }
      );

      if (updateErr) {
        console.warn("Auto-confirm error:", updateErr.message);
        return NextResponse.json({ error: updateErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        user: updated.user,
        message: "Email auto-confirmed successfully."
      });
    }

    // If user does not exist and password provided, create them pre-confirmed
    if (password) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: { name: name || cleanEmail.split('@')[0] },
      });

      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        user: created.user,
        message: "Account created and pre-confirmed."
      });
    }

    return NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
