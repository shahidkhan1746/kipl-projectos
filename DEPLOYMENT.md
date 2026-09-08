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

## The mobile app was pointed at the wrong host

`kiplstpsrinagar.com` is the **frontend**, served by Vercel. `frontend/vercel.json`
rewrites `/(.*)` to `/index.html` and defines no `/api` proxy, so every path on
that host is a static asset:

| Request | What Vercel does |
| --- | --- |
| `GET https://kiplstpsrinagar.com/api/v1/...` | returns the SPA's HTML |
| `POST https://kiplstpsrinagar.com/api/v1/auth/login` | returns **405 Method Not Allowed** |

The mobile app compiled that address in as its default endpoint, so sign-in
could never succeed and was reported to site staff as a credentials problem.

**The Render hostname for the API is not recorded anywhere in this
repository.** It has to be supplied from outside:

- Set a repository **variable** (not a secret — it is a public hostname)
  `API_BASE_URL` under Settings → Secrets and variables → Actions → Variables,
  to `https://<render-host>/api/v1`.
- `mobile.yml` passes it to the debug APK as `--dart-define=KIPL_API_BASE_URL`
  and warns if it is missing.
- `mobile-release.yml` **fails the build** if it is missing, because a Play
  release with the wrong endpoint cannot be corrected without a new upload and
  a new review. It also accepts a one-off `api_base_url` workflow input.

Until that variable is set, each device has to be pointed at the API by hand
under Server Configuration on the login screen.

### Diagnosing an endpoint from the phone

`GET /api/v1/health` is unauthenticated and returns
`{"service":"kipl-projectos-api","status":"ok","time":...}`. The login screen's
Server Configuration sheet has a **Check this address** button that calls it
and reports what actually answered — the API, the website, or nothing. The
login screen also shows the endpoint currently in use underneath the form, and
flags `10.0.2.2`, `localhost` and `127.0.0.1` in red: those are emulator and
development addresses that cannot resolve on a physical phone, and a device
that once saved one keeps using it silently on every launch. **Forget saved
endpoint** clears it.
