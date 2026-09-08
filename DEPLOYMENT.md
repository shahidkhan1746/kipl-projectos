# Where KIPL ProjectOS actually runs

| Piece | Platform |
| --- | --- |
| Backend API | **Render — free tier** |
| Frontend | Vercel (`frontend/vercel.json`) |
| Mobile | Android APK / AAB via GitHub Actions |

`railway.json` used to sit in the repository root. The backend was on Railway a
long time ago and has since moved to Render; that file was left behind and was
the only deployment config present, so it repeatedly misled people — including
automated tooling — into diagnosing Railway problems on a Render service. It is
deleted. Recover it from git history if the platform ever changes back.

## The free tier is a functional constraint, not a billing detail

A Render free-tier service **spins down when idle and takes roughly 50 seconds
to wake**. During that time Render's router accepts the TCP connection straight
away and holds the request open, so a cold start does **not** look like a
connection failure to a client — it looks like a very slow response.

This directly caused a real field failure: the mobile app used a 30-second
receive timeout, gave up before the instance had woken, and reported "Login
failed. Please check your credentials." on a completely healthy backend and
correct credentials.

What the mobile client now does about it (`mobile/lib/core/api/api_client.dart`):

- `kWarmReceiveTimeout` (30s) for normal traffic, so a genuinely dead server
  still fails fast
- `kColdStartReceiveTimeout` (90s) applied on a single automatic retry when a
  request times out
- The retry is limited to requests that are safe to send twice — GET, and
  `/auth/login`. A receive timeout means the request *was* delivered, so
  replaying a POST or PATCH could duplicate an attendance record or a site
  diary entry. Those are never retried.

Anything else that talks to this API needs the same allowance. Assuming a
response within 30 seconds is not safe on this tier.

## If the cold start stops being acceptable

The wake delay is inherent to the free tier — no client-side change removes it,
it can only be tolerated. The options are a paid Render instance that does not
sleep, or an external uptime pinger, which keeps it warm but consumes the free
tier's monthly instance hours.
