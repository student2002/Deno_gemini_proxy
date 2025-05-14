import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

const TARGET_HOST = "https://generativelanguage.googleapis.com";

function getProxyHost(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

async function proxyRequest(request: Request, replaceHost: boolean): Promise<Response> {
  try {
    const { pathname, search } = new URL(request.url);
    const targetUrl = `${TARGET_HOST}${pathname}${search}`;
    console.log(`Proxying to target: ${targetUrl}`);

    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const headers = new Headers(upstreamResponse.headers);

    if (replaceHost) {
      const proxyHost = getProxyHost(request);
      console.log(`Replacing headers from ${TARGET_HOST} to ${proxyHost}`);
      for (const [key, value] of headers.entries()) {
        if (value.includes(TARGET_HOST)) {
          headers.set(key, value.replace(TARGET_HOST, proxyHost));
        }
      }
    }

    // 直接使用流式响应体
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers,
    });

  } catch (error) {
    console.error("Proxy error:", error);
    return new Response("Proxy error", { status: 502 });
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/upload/v1beta/files" && request.method === "POST") {
    console.log("[Special] Handling /upload/v1beta/files POST");
    return proxyRequest(request, true);
  }

  return proxyRequest(request, false);
}

console.log("Proxy is running on http://localhost:8000");
serve(handleRequest, { port: 8000 });