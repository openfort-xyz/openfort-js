---
'@openfort/openfort-js': patch
---

Fixed telemetry opt-out when the shared SDK reporter was already initialized or still loading. Subsequent SDK captures and buffered events were discarded after opt-out, and delayed events from a retired reporter were dropped before transport. An explicit later initialization with telemetry enabled resumed reporting without replaying discarded events.
