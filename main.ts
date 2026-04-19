const TARGET_HOST = "https://generativelanguage.googleapis.com";

function getProxyHost(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function proxyRequest(request: Request, replaceHost = false): Promise<Response> {
  try {
    const url = new URL(request.url);
    const targetUrl = `${TARGET_HOST}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.delete("host"); // 必须删

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.body ?? undefined,
      redirect: "manual",
    });

    const respHeaders = new Headers(upstream.headers);

    // ✅ 禁止缓存（对流很关键）
    respHeaders.set("cache-control", "no-store");

    // ✅ 仅 upload 场景替换 host
    if (replaceHost) {
      const proxyHost = getProxyHost(request);

      for (const [k, v] of respHeaders.entries()) {
        if (v.includes(TARGET_HOST)) {
          respHeaders.set(k, v.replace(TARGET_HOST, proxyHost));
        }
      }
    }

    // ✅ 关键：直接透传 stream（不要动 body）
    return new Response(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });

  } catch (err) {
    console.error("Proxy error:", err);
    return new Response("Proxy error", { status: 502 });
  }
}

Deno.serve(async (request: Request) => {
  const url = new URL(request.url);

  // ✅ 健康检查
  if (url.pathname === "/") {
    return new Response("ok");
  }

  // ✅ Gemini 文件上传（需要 header rewrite）
  if (url.pathname === "/upload/v1beta/files" && request.method === "POST") {
    return proxyRequest(request, true);
  }

  // ✅ 普通 + 流式统一处理（完全透传）
  return proxyRequest(request, false);
});