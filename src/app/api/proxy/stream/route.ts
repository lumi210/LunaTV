/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

function withCorsHeaders(headers: Headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Range, Origin, Accept',
  );
  headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, Content-Type',
  );
}

function copyHeader(
  from: Headers,
  to: Headers,
  sourceKey: string,
  targetKey = sourceKey,
) {
  const value = from.get(sourceKey);
  if (value) {
    to.set(targetKey, value);
  }
}

export async function OPTIONS() {
  const headers = new Headers();
  withCorsHeaders(headers);
  return new Response(null, { status: 204, headers });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const source =
    searchParams.get('moontv-source') || searchParams.get('decotv-source');
  const uaParam = searchParams.get('ua');

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  const config = await getConfig();
  const liveSource = config.LiveConfig?.find((s: any) => s.key === source);
  
  // 如果找不到源配置，使用默认 UA 或传入的 UA 参数
  const ua = uaParam || liveSource?.ua || 'AptvPlayer/1.4.10';
  const decodedUrl = decodeURIComponent(url);

  console.log(`[PROXY/STREAM] Source: ${source || 'unknown'}, UA: ${ua}, URL: ${decodedUrl.substring(0, 100)}...`);

  try {
    const requestHeaders = new Headers();
    requestHeaders.set('User-Agent', ua);
    requestHeaders.set('Accept', '*/*');
    requestHeaders.set('Accept-Encoding', 'gzip, deflate');
    requestHeaders.set('Connection', 'keep-alive');

    const range = request.headers.get('range');
    if (range) {
      requestHeaders.set('Range', range);
    }

    const response = await fetch(decodedUrl, {
      cache: 'no-cache',
      redirect: 'follow',
      headers: requestHeaders,
    });

    if (!response.ok && response.status !== 206) {
      console.error(`[PROXY/STREAM] Upstream error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Upstream error: ${response.status}`, url: decodedUrl.substring(0, 100) },
        { status: response.status || 500 },
      );
    }

    const headers = new Headers();
    withCorsHeaders(headers);
    headers.set('Cache-Control', 'no-cache');

    copyHeader(response.headers, headers, 'content-type', 'Content-Type');
    copyHeader(response.headers, headers, 'content-length', 'Content-Length');
    copyHeader(response.headers, headers, 'content-range', 'Content-Range');
    copyHeader(response.headers, headers, 'accept-ranges', 'Accept-Ranges');
    copyHeader(
      response.headers,
      headers,
      'content-disposition',
      'Content-Disposition',
    );

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/octet-stream');
    }
    if (!headers.has('Accept-Ranges')) {
      headers.set('Accept-Ranges', 'bytes');
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error: any) {
    console.error(`[PROXY/STREAM] Error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch stream', details: error.message },
      { status: 500 },
    );
  }
}
