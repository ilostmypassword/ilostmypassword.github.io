import type { APIRoute } from "astro";
import { PGP } from "../consts";

export const GET: APIRoute = () =>
    new Response(PGP.key, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
