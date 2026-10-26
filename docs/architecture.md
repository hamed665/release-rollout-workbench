# FlagPilot: design and integration notes

## Separation of concerns

The core exports `analyze(input)` and lower-level domain functions. It has no
DOM, storage or network dependency. The browser adapter handles input parsing,
status reporting and safe text rendering. The CLI handles files and stdout.
Both use the same engine, preventing the demo from becoming a mock result.

## Build reproducibility

The build script combines validation, engine and UI source with the synthetic
fixture into one offline HTML file. CI rebuilds and checks for a diff. No remote
fonts, analytics, CDN scripts or package install are needed.

## Failure semantics

Malformed configuration fails explicitly before a successful report is returned.
The UI clears prior results on failure to prevent accidental stale exports.
Empty results have a distinct message. Tables display up to 500 rows while JSON
export retains the full report. In-memory input arrays are bounded.

## Scope

FNV-1a is a deterministic noncryptographic hash; never use this for authorization, eligibility decisions, fraud controls or secret allocation. There is no remote configuration server or experiment significance analysis. Changing salt, key or variant weights may reassign subjects. Use pseudonymous IDs.

## Integration next steps

Add application-specific authentication and authorization before accepting
untrusted network input. Choose persistence, retention and monitoring based on
the actual use case. Measure performance against representative data before
making throughput or accuracy claims. Unit tests prove specific behaviors,
not production availability or an accessibility certification.
