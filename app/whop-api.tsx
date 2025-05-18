"use server";

import { WhopApi, makeUserTokenVerifier } from "@whop/api";

export async function getWhopApi() {
    return WhopApi({
        appApiKey: process.env.WHOP_API_KEY ?? "fallback",
        onBehalfOfUserId: process.env.WHOP_AGENT_USER_ID,
    });
}

export async function verifyUserToken() {
    return makeUserTokenVerifier({
        appId: process.env.WHOP_APP_ID ?? "fallback",
        dontThrow: true,
    });
}