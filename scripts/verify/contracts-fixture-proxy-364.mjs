// Verification-only CORS proxy and fixture scenarist for the frozen contracts
// mock on :8097. Ticket #364.
//
// Two jobs, neither touching product or contract code:
//  1. The mock answers `Access-Control-Allow-Origin: *`, which browsers reject
//     for credentialed fetches. This echoes the requesting origin.
//  2. Some MICE states are not in the shared fixture set (register form,
//     waitlist, checked-in, ended, empty, error). MICE_SCENARIO rewrites only
//     the mobile MICE reads so the implemented screens can be exercised.
//
// Unknown paths and every mutation pass straight through.
//
//   node scripts/verify/contracts-fixture-proxy-364.mjs
import { createServer } from "node:http";

const PORT = Number(process.env.MICE_PROXY_PORT ?? 8096);
const UPSTREAM = process.env.MICE_MOCK_UPSTREAM ?? "http://127.0.0.1:8097";

function json(res, status, body, headers = {}) {
  res.writeHead(status, { ...headers, "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function scenario() {
  return process.env.MICE_SCENARIO ?? "default";
}

function waitlisted(reg) {
  return {
    ...reg,
    status: "waitlisted",
    waitlistPosition: 3,
    confirmBy: "2026-11-21T17:00:00Z",
    ticket: null,
    checkIn: null,
  };
}

function checkedIn(reg) {
  return {
    ...reg,
    status: "checked_in",
    checkIn: {
      checkedInAt: "2026-12-05T08:12:00+03:00",
      method: "qr",
      by: "Door scanner",
    },
  };
}

function endedEvent(event) {
  return {
    ...event,
    status: "ended",
    startsAt: "2026-11-14T08:00:00+03:00",
    endsAt: "2026-11-15T17:00:00+03:00",
  };
}

function rewrite(pathname, method, payload) {
  const scenarioName = scenario();
  if (scenarioName === "default" || method !== "GET" || !payload || typeof payload !== "object") {
    return payload;
  }

  const isRegistration = /^\/v1\/mobile\/events\/[^/]+\/registration$/.test(pathname);
  const isRegistrations = pathname === "/v1/mobile/registrations";
  const isEvent = /^\/v1\/public\/events\/[^/]+$/.test(pathname);
  const isFeed = pathname === "/v1/public/events";
  const isTicket = /^\/v1\/mobile\/events\/[^/]+\/ticket$/.test(pathname);

  if (scenarioName === "empty" && (isFeed || isRegistrations)) {
    return { items: [], page: { hasMore: false, nextCursor: null } };
  }

  if (scenarioName === "register" && isRegistration) return null; // handled as 404 below
  if (scenarioName === "register" && (isEvent || isRegistrations)) {
    if (isEvent) {
      const { registration, ...rest } = payload;
      return rest;
    }
    return { ...payload, items: [] };
  }

  if (scenarioName === "waitlist") {
    if (isRegistration) return waitlisted(payload);
    if (isRegistrations) return { ...payload, items: (payload.items ?? []).map(waitlisted) };
    if (isEvent && payload.registration) return { ...payload, registration: waitlisted(payload.registration) };
    if (isTicket) return undefined; // 404
  }

  if (scenarioName === "checked") {
    if (isRegistration) return checkedIn(payload);
    if (isRegistrations) return { ...payload, items: (payload.items ?? []).map(checkedIn) };
    if (isEvent && payload.registration) return { ...payload, registration: checkedIn(payload.registration) };
  }

  if (scenarioName === "ended") {
    if (isEvent) return { ...endedEvent(payload), registration: payload.registration ?? null };
    if (isFeed) return { ...payload, items: (payload.items ?? []).map(endedEvent) };
    if (isRegistrations)
      return { ...payload, items: (payload.items ?? []).map((item) => ({ ...item, event: item.event ? endedEvent(item.event) : item.event })) };
  }

  return payload;
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin ?? "*";
  const headers = {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "Authorization, Content-Type, Idempotency-Key, X-Fixture-State",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-expose-headers":
      "X-Contract-Version, X-Data-Stale, X-Fixture-Route, X-Fixture-State, X-Fixture-State-Fallback",
    vary: "Origin",
  };
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    return res.end();
  }

  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const scenarioName = scenario();

  if (scenarioName === "error" && req.method === "GET" && url.pathname.startsWith("/v1/")) {
    return json(
      res,
      503,
      { error: { code: "FIXTURE_ERROR", message: "The service is unavailable. Reference ERR-MICE-503." } },
      headers,
    );
  }
  if (scenarioName === "register" && req.method === "GET" && /^\/v1\/mobile\/events\/[^/]+\/registration$/.test(url.pathname)) {
    return json(
      res,
      404,
      { error: { code: "NOT_FOUND", message: "No registration for this event." } },
      headers,
    );
  }
  if (scenarioName === "waitlist" && req.method === "GET" && /^\/v1\/mobile\/events\/[^/]+\/ticket$/.test(url.pathname)) {
    return json(res, 404, { error: { code: "NOT_FOUND", message: "No ticket." } }, headers);
  }

  try {
    const upstream = await fetch(`${UPSTREAM}${req.url}`, {
      method: req.method,
      headers: {
        "content-type": req.headers["content-type"] ?? "application/json",
        "x-fixture-state": req.headers["x-fixture-state"] ?? "",
        authorization: req.headers.authorization ?? "",
      },
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await new Promise((resolve) => {
              const chunks = [];
              req.on("data", (c) => chunks.push(c));
              req.on("end", () => resolve(Buffer.concat(chunks)));
            }),
    });
    let body = Buffer.from(await upstream.arrayBuffer());
    const out = { ...headers };
    upstream.headers.forEach((value, key) => {
      if (!key.startsWith("access-control-")) out[key] = value;
    });
    // The body may be rewritten below, so upstream framing headers are stale.
    delete out["content-length"];
    delete out["content-encoding"];
    delete out["transfer-encoding"];

    if ((out["content-type"] ?? "").includes("application/json") && body.length) {
      try {
        const parsed = JSON.parse(body.toString("utf8"));
        const next = rewrite(url.pathname, req.method, parsed);
        body = Buffer.from(JSON.stringify(next), "utf8");
      } catch {
        // Non-JSON or a fixture this proxy does not touch.
      }
    }
    out["content-length"] = String(body.length);
    res.writeHead(upstream.status, out);
    res.end(body);
  } catch (error) {
    res.writeHead(502, { ...headers, "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code: "PROXY_ERROR", message: String(error) } }));
  }
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`mice fixture proxy: ${PORT} -> ${UPSTREAM} (scenario=${scenario()})`),
);
