import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const response = await fetch("https://shield.openfort.xyz/project/encryption-session", {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.NEXT_PUBLIC_SHIELD_API_KEY!,
                "x-api-secret": process.env.NEXTAUTH_SHIELD_SECRET_KEY!,
            },
            method: "POST",
            body: JSON.stringify({
                encryption_part: process.env.NEXTAUTH_SHIELD_ENCRYPTION_SHARE!,
            }),
        });

        if (!response.ok) {
            throw new Error("Failed to authorize user");
        }

        const jsonResponse = await response.json();
        return NextResponse.json({
            session: jsonResponse.session_id,
        }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({
            error: 'Internal server error',
        }, { status: 500 });
    }
}