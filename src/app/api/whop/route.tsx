"use server";

import { getWhopApi } from "../../whop-api";

export async function GET() {
    const api = await getWhopApi();
    console.log("Whop API Instance:", api); // ✅ Debugging

    return new Response(JSON.stringify(api), {
        headers: { "Content-Type": "application/json" },
    });
}