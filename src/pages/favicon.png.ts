import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SIZE = 128;
const NAMES = ["profile", "avatar"];
const EXTS = ["jpg", "jpeg", "png", "webp"];

async function loadAvatar(): Promise<Buffer | null> {
    for (const name of NAMES) {
        for (const ext of EXTS) {
            try {
                return await readFile(
                    join(process.cwd(), "src", "assets", `${name}.${ext}`),
                );
            } catch {
                // fichier absent, on essaie le suivant
            }
        }
    }
    return null;
}

export const GET: APIRoute = async () => {
    const input = await loadAvatar();
    if (!input) return new Response(null, { status: 404 });

    const mask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`,
    );

    const png = await sharp(input)
        .resize(SIZE, SIZE, { fit: "cover" })
        .ensureAlpha()
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();

    return new Response(new Uint8Array(png), {
        headers: { "Content-Type": "image/png" },
    });
};
