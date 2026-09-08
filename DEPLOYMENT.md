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

The API is the Render web service `kipl-projectos`:

    https://kipl-projectos.onrender.com/api/v1

`frontend/vercel.json` now rewrites `/api/v1/:path*` through to it. **Rule
order matters** — the API rule has to sit before the `/(.*)` SPA catch-all, or
the catch-all swallows it and the 405 comes back.

The web app is what the rewrite is for: same origin, so no CORS
configuration, no `FRONTEND_URL` list to keep in step with every Vercel
preview domain, and no second hostname in the browser. To move the frontend
onto it, set `VITE_API_URL` to an empty string in the Vercel project — the API
modules already prefix every path with `/api/v1`, so a blank base makes them
same-origin. Leaving `VITE_API_URL` unset is **not** the same thing: the code
falls back to `http://localhost:3000`.

### The mobile app deliberately does not use the rewrite

It points straight at `kipl-projectos.onrender.com`. A native client gains
nothing from a same-origin proxy — there is no CORS — and it inherits a real
cost: the proxy applies its own response deadline, which is shorter than a
~50 second free-tier wake, so a cold start arrives as a 504 to retry around
instead of a slow response to wait out. One hop fewer, on exactly the path
where the wake has to be survived.

`ColdStartInterceptor` handles both shapes anyway, since a device may still be
pointed at the domain by hand:

- retries on 502/503/504 as well as on timeouts (Render answers 502/503 while
  an instance starts; a proxy answers 504 when it stops waiting)
- up to `maxColdStartRetries` (2), because behind a proxy the retry inherits
  the proxy's deadline and can expire a second time mid-wake
- still only for requests that are safe to send twice — GET and `/auth/login`

### Overriding the endpoint per build

- Repository **variable** (not a secret — it is a public hostname)
  `API_BASE_URL` under Settings → Secrets and variables → Actions → Variables.
- `mobile.yml` passes it to the debug APK as `--dart-define=KIPL_API_BASE_URL`
  and warns if it is missing.
- `mobile-release.yml` **fails the build** if it is missing, because a Play
  release with the wrong endpoint cannot be corrected without a new upload and
  a new review. It also accepts a one-off `api_base_url` workflow input.

Without it the build falls back to the constant in `api_client.dart`, which is
the Render address above.

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
