// gemini_native_proxy.ts
import { serve } from "https://deno.land/std@0.202.0/http/server.ts";

const TARGET_HOST = "https://generativelanguage.googleapis.com";

async function handler(req: Request): Promise<Response> {
  try {
    // 完整保留原始路径和参数
    const targetUrl = new URL(req.url.replace(/^https?:\/\/[^/]+/, TARGET_HOST));
    
    // 透传所有请求细节
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.body
    });

    // 添加 CORS 支持
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    
    return new Response(response.body, {
      status: response.status,
      headers
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Proxy Error",
      message: error.message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

serve(handler, { port: 8000 });