# Ruta client security

[Español](SECURITY.md)

The client does not persist access tokens or contain private keys. The access token exists only in memory, while the renewable session belongs to an API-managed `HttpOnly` cookie. HTTP write operations include `X-Ruta-Client`; return routes and external scripts are checked against allowlists.

The public demo sandbox is the only browser persistence unrelated to the private session. It is isolated under `ruta.portfolio-demo.v2`, contains fictional data only and can be reset from the interface. Normal demo navigation does not call the API or external providers. Google Maps opens only after an explicit marker action.

## Deployment

- Serve the site exclusively over HTTPS and verify that the provider applies the headers defined in `public/_headers`.
- Keep the API on the same site where possible and restrict `connect-src`, `script-src`, `frame-src` and `img-src` to providers that are actually required.
- Never place secrets in `environment*.ts`, bundles, logs, source maps or CI actions. Google and Turnstile use public identifiers only.
- Disable production source maps, keep dependencies locked and run builds, tests and dependency auditing before deployment.
- Use `rel="noopener noreferrer"` for external links that open a new tab and never render user content as raw HTML.
- Keep `/demo` as the only public product route; the rest of the application must remain protected by session and invitation controls.

Remote images, tiles and services may disclose the browser's IP address to their provider. Before accepting real users, document this processing, minimise providers and review the deployed Content Security Policy.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository when available. Do not include credentials, tokens, private trip data or destructive proof-of-concept steps in a public issue.
