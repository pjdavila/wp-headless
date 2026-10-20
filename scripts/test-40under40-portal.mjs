// Tests for delivering 40 Under 40 nominations to the forms portal
// (lib/fortyUnder40Webhook.js). Uses a local HTTP server that parses the real
// multipart body — never calls the real portal. Run with:
//   npm run test:40under40

import assert from "node:assert/strict";
import http from "node:http";
import {
  buildPortalFields,
  interpretPortalResponse,
  isPortalAllowedLink,
  sendFortyUnder40Webhook,
  toPortalApplicantType,
} from "../lib/fortyUnder40Webhook.js";

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

const PDF = Buffer.from("%PDF-1.4\n% test letter\n%%EOF\n", "latin1");

function samplePayload(overrides = {}) {
  return {
    event: "application.created",
    submittedAt: "2026-10-20T14:00:00.000Z",
    application: {
      id: "11111111-2222-3333-4444-555555555555",
      applicantType: "colleague",
      nominatorName: "Ana Nominadora",
      nominatorEmail: "ana@example.com",
      fullName: "Juan Candidato",
      email: "juan@example.com",
      phone: "7875551234",
      jobTitle: "CFO",
      company: "Acme PR",
      town: "San Juan",
      country: "PR",
      linkedin: "https://www.linkedin.com/in/juan",
      bio: "Short bio.",
      consent: true,
    },
    documents: [
      {
        field: "recommendation1",
        filename: "carta1.pdf",
        contentType: "application/pdf",
        buffer: PDF,
        url: "https://abc.r2.cloudflarestorage.com/x?sig=1",
      },
      {
        field: "recommendation2",
        filename: "carta2.pdf",
        contentType: "application/pdf",
        buffer: PDF,
        url: "https://drive.google.com/file/d/abc",
      },
      {
        field: "recommendation3",
        filename: "carta3.pdf",
        contentType: "application/pdf",
        contentBase64: PDF.toString("base64"),
      },
    ],
    source: { ipPrefix: "1.2.3.0", userAgent: "test" },
    ...overrides,
  };
}

// Fake portal: responds with a scripted sequence and records each request.
async function withPortal(responses, fn) {
  const requests = [];
  let i = 0;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const form = await new Response(body, {
      headers: { "content-type": req.headers["content-type"] },
    }).formData();
    requests.push({ headers: req.headers, form });
    const [status, json] = responses[Math.min(i++, responses.length - 1)];
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(json));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/api/forms-webhook/40-under-40-caribbean-business`;
  try {
    return await fn({ url, requests });
  } finally {
    server.close();
  }
}

const OPTS = { secret: "test-secret", retryDelayMs: 1, timeoutMs: 5000 };

// --- payload ---------------------------------------------------------------

test("maps applicant types to the portal's values", () => {
  assert.equal(toPortalApplicantType("colleague"), "nominate");
  assert.equal(toPortalApplicantType("nominate"), "nominate");
  assert.equal(toPortalApplicantType("self"), "self");
  assert.equal(toPortalApplicantType(undefined), "self");
});

test("uses the portal's field names and fixed values", () => {
  const fields = buildPortalFields(samplePayload());
  assert.deepEqual(Object.keys(fields).sort(), [
    "applicantType",
    "bio",
    "company",
    "consent",
    "country",
    "email",
    "event",
    "id",
    "ipPrefix",
    "jobTitle",
    "linkedin",
    "name",
    "nominatorEmail",
    "nominatorName",
    "phone",
    "program",
    "submittedAt",
    "town",
    "userAgent",
  ]);
  assert.equal(fields.event, "application.created");
  assert.equal(fields.program, "40under40");
  assert.equal(fields.applicantType, "nominate");
  assert.equal(fields.name, "Juan Candidato");
  assert.equal(fields.consent, "true");
});

test("an id-only resend sends no empty text fields", () => {
  const fields = buildPortalFields({
    event: "application.created",
    application: { id: "abc" },
  });
  assert.deepEqual(fields, {
    id: "abc",
    event: "application.created",
    program: "40under40",
  });
});

test("only links on the portal's allowed hosts pass", () => {
  assert.equal(
    isPortalAllowedLink("https://caribbeanbusiness.com/f.pdf"),
    true,
  );
  assert.equal(isPortalAllowedLink("https://files.vnmedia.co/f.pdf"), true);
  assert.equal(
    isPortalAllowedLink("https://www.jotform.com/uploads/x.pdf"),
    true,
  );
  assert.equal(
    isPortalAllowedLink("https://drive.google.com/file/d/abc"),
    true,
  );
  assert.equal(
    isPortalAllowedLink(
      "https://caribbean.business/api/40under40-file/?file=x",
    ),
    false,
  );
  assert.equal(
    isPortalAllowedLink("https://abc.r2.cloudflarestorage.com/x"),
    false,
  );
  assert.equal(
    isPortalAllowedLink("https://evilcaribbeanbusiness.com/x"),
    false,
  );
  assert.equal(isPortalAllowedLink("http://caribbeanbusiness.com/x"), false);
  assert.equal(isPortalAllowedLink(null), false);
});

test("sends key in x-form-secret, letters as real PDF parts, allowed links only", async () => {
  await withPortal(
    [[201, { entryId: "e1", files: ["recommendation1"], warnings: [] }]],
    async ({ url, requests }) => {
      const result = await sendFortyUnder40Webhook(samplePayload(), {
        ...OPTS,
        url,
      });
      assert.equal(result.status, "ok");
      assert.equal(requests.length, 1);
      const { headers, form } = requests[0];
      assert.equal(headers["x-form-secret"], "test-secret");
      assert.equal(headers.authorization, undefined);
      assert.match(headers["content-type"], /^multipart\/form-data/);
      for (const field of [
        "recommendation1",
        "recommendation2",
        "recommendation3",
      ]) {
        const file = form.get(field);
        assert.ok(file && typeof file === "object", `${field} attached`);
        assert.equal(file.type, "application/pdf");
        assert.equal(
          Buffer.from(await file.arrayBuffer())
            .subarray(0, 5)
            .toString("latin1"),
          "%PDF-",
        );
      }
      assert.equal(form.get("recommendation1").name, "carta1.pdf");
      assert.equal(
        form.get("recommendation1Url"),
        null,
        "R2 link not on allowed list",
      );
      assert.equal(
        form.get("recommendation2Url"),
        "https://drive.google.com/file/d/abc",
      );
      assert.equal(form.get("applicantType"), "nominate");
      assert.equal(form.get("program"), "40under40");
      assert.equal(
        form.get("fullName"),
        null,
        "no legacy duplicate field names",
      );
    },
  );
});

// --- responses -------------------------------------------------------------

test("201 is stored with entryId and warnings", async () => {
  await withPortal(
    [
      [
        201,
        {
          entryId: "e42",
          files: ["recommendation1"],
          warnings: ["recommendation3: not a real PDF"],
        },
      ],
    ],
    async ({ url }) => {
      const r = await sendFortyUnder40Webhook(samplePayload(), {
        ...OPTS,
        url,
      });
      assert.equal(r.status, "ok");
      assert.equal(r.httpStatus, 201);
      assert.equal(r.entryId, "e42");
      assert.equal(r.duplicate, false);
      assert.deepEqual(r.warnings, ["recommendation3: not a real PDF"]);
      assert.equal(r.attempts, 1);
    },
  );
});

test("200 duplicate is ok and records addedFiles", async () => {
  await withPortal(
    [
      [
        200,
        {
          duplicate: true,
          entryId: "e1",
          addedFiles: ["recommendation2", "recommendation3"],
        },
      ],
    ],
    async ({ url }) => {
      const r = await sendFortyUnder40Webhook(samplePayload(), {
        ...OPTS,
        url,
      });
      assert.equal(r.status, "ok");
      assert.equal(r.duplicate, true);
      assert.deepEqual(r.addedFiles, ["recommendation2", "recommendation3"]);
    },
  );
});

for (const status of [401, 400, 413]) {
  test(`${status} fails without retrying`, async () => {
    await withPortal(
      [[status, { error: "nope" }]],
      async ({ url, requests }) => {
        const r = await sendFortyUnder40Webhook(samplePayload(), {
          ...OPTS,
          url,
        });
        assert.equal(r.status, "failed");
        assert.equal(r.httpStatus, status);
        assert.equal(requests.length, 1);
        assert.match(r.error, new RegExp(`Portal responded ${status}`));
      },
    );
  });
}

test("500 is retried with the same id, then succeeds", async () => {
  await withPortal(
    [
      [500, { error: "boom" }],
      [201, { entryId: "e9" }],
    ],
    async ({ url, requests }) => {
      const r = await sendFortyUnder40Webhook(samplePayload(), {
        ...OPTS,
        url,
      });
      assert.equal(r.status, "ok");
      assert.equal(r.attempts, 2);
      assert.equal(requests.length, 2);
      assert.equal(requests[0].form.get("id"), requests[1].form.get("id"));
    },
  );
});

test("500 twice ends as failed after two attempts", async () => {
  await withPortal([[500, { error: "boom" }]], async ({ url, requests }) => {
    const r = await sendFortyUnder40Webhook(samplePayload(), { ...OPTS, url });
    assert.equal(r.status, "failed");
    assert.equal(r.httpStatus, 500);
    assert.equal(requests.length, 2);
  });
});

test("a network error is retried and reported", async () => {
  let calls = 0;
  const r = await sendFortyUnder40Webhook(samplePayload(), {
    ...OPTS,
    url: "https://portal.invalid/x",
    fetchImpl: async () => {
      calls += 1;
      throw new Error("ECONNRESET");
    },
  });
  assert.equal(r.status, "failed");
  assert.equal(calls, 2);
  assert.match(r.error, /ECONNRESET/);
});

test("no URL configured => skipped, nothing sent", async () => {
  const r = await sendFortyUnder40Webhook(samplePayload(), { url: "" });
  assert.equal(r.status, "skipped");
});

test("interprets a non-JSON error body without throwing", () => {
  const r = interpretPortalResponse(502, "Bad gateway");
  assert.equal(r.ok, false);
  assert.equal(r.retryable, true);
  assert.match(r.error, /Bad gateway/);
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log("ok   -", name);
  } catch (err) {
    failed += 1;
    console.error("FAIL -", name);
    console.error(err);
  }
}
if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} tests passed`);
