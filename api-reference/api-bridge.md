# API Bridge

Every method raises [`SkapiError`](/introduction/errors) with a `code` and a `message`. Values that fail a check raise `INVALID_PARAMETER` before anything is sent. Any method can raise `NETWORK_ERROR` when no answer comes back, and `TIMEOUT`, `RATE_LIMITED` or `SERVER_ERROR` for the other failures on the way (the polls below try those again instead). See [Forwarding Requests](/api-bridge/forward-request).

A request is addressed by its `request_id`, or by its short `id` (`"<stamp>:<entropy>"`) together with the `url` and `method` it was sent with. A signed-out caller can only reach its own requests from the same IP address and User-Agent; any other caller gets `NOT_EXISTS` (`Request not found.`).

## forward_request

```python
skapi.forward_request(options: dict, form: dict | None = None, *, on_stream: Callable[[str, int], None] | None = None) -> Any
```

Calls another API from Skapi's server.

| argument | |
|---|---|
| `options` | Required. Keys below. |
| `form` | dict merged into `data`, or into `params` for `GET`, `DELETE` and `HEAD`; an option's own key wins. With `multipart`, the multipart body. |
| `on_stream` | `(text, seq)`, called with each relayed piece of a streamed request, in order. Exceptions it raises are ignored. |

| option key | type | |
|---|---|---|
| `url` | str | Required. A full URL. |
| `method` | str | `"GET"`, `"POST"` (default), `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"`, any case. |
| `headers` | dict | No name starting with `x-skapi-`. |
| `data` | dict | The body: JSON when `Content-Type` is `application/json`, form-encoded otherwise. |
| `params` | dict | The query string. |
| `secretName` | str | A client secret of the project. Its value replaces `"$CLIENT_SECRET"` in `url` and in every string of `headers`, `data` and `params`. Left out when `"$CLIENT_SECRET"` appears nowhere. |
| `skapiHeaders` | bool or `{"user"?: bool, "service"?: bool}` | Sends `x-skapi-user` (the signed-in user's ID) and `x-skapi-service`. |
| `queue` | str | Queue the request on the server. No colons. |
| `poll` | int, float or bool | Milliseconds between checks, 1000 or more (`True` = 1000; `0` does not poll); a shorter one is refused with `INVALID_PARAMETER`. Waits for the answer; makes a queue name when none is given. |
| `stream` | bool | Relay the answer as it arrives. Queued and polled like `poll`. |
| `expires` | int | Seconds the request stays in the history after it settles. |
| `multipart` | bool | Send `form` as `multipart/form-data`. Files are `{"file", "filename"?, "content_type"?}` dicts or `bytes`. |
| `responseType` | `"json"` or `"text"` | Reshapes the answer. An envelope is returned unchanged. |
| `cref` | str | Your own reference for this request: 1 to 64 letters, digits, `_` or `-`. Stored on it and handed back by the reply, [forward_request_history](#forward-request-history), [forward_request_status](#forward-request-status) and [forward_request_read](#forward-request-read), so a send whose reply was lost can be found instead of sent again. Make a new one per request. |
| `notify` | bool | Status push for a queued request of a signed-in user: each status change arrives over the realtime connection, and the poll reads the request when one arrives and otherwise once a minute. The reply has `"notify": True` when the server accepted it; otherwise nothing changes. See [on_request_status](#on-request-status). |

`"$ACCESS_TOKEN"` anywhere in `url`, `headers`, `data` or `params` becomes the signed-in user's access token (empty when signed out).

Returns:

- no `queue`, `poll` or `stream`: the destination's answer, parsed JSON or text, even when it looks like `{"status": "pending", "id": ...}`. Its status code is not returned.
- `queue` without `poll`: `{"id", "status": "pending", "queue_name", "in_queue", "request_id"}`, plus `"cref"` and `"notify": True` when those were given and accepted.
- `poll` or `stream`: what [forward_request_poll](#forward-request-poll) returns once the request settles.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"options" is required in the second argument.` |
| `INVALID_PARAMETER` | `"apiKeyHeader" and "apiKeyScheme" are no longer supported. Store the key as a client secret, name it with "secretName", and put "$CLIENT_SECRET" where the key goes.` |
| `INVALID_PARAMETER` | `"url" should be type: <string>.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"method" should be one of "GET", "POST", "PUT", "PATCH", "DELETE" or "HEAD".` |
| `INVALID_PARAMETER` | `"headers" should be type: <object>.` / `"data" should be type: <object>.` / `"params" should be type: <object>.` |
| `INVALID_PARAMETER` | `"headers" cannot set "<name>": the "x-skapi-" prefix is reserved. Use "skapiHeaders" to tell the destination who the caller is.` |
| `INVALID_PARAMETER` | `"skapiHeaders" should be type: <boolean> or { user?: boolean; service?: boolean }.` |
| `INVALID_PARAMETER` | `<value> is invalid in "secretName". allowed type or value is: Type<string>.` (also `"queue"`; `Type<number>` for `"expires"`) |
| `INVALID_PARAMETER` | `"stream" should be type: <boolean>.` / `"notify" should be type: <boolean>.` / `"multipart" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `"cref" should be 1 to 64 characters of letters, digits, "_" or "-".` |
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` |
| `INVALID_PARAMETER` | `"responseType" should be either "json" or "text".` / `"responseType": "response" is not available here. ...` |
| `INVALID_PARAMETER` | `"data" cannot be sent with "multipart": true. The form itself is the body.` |
| `INVALID_PARAMETER` | `"multipart": true needs a form body in the first argument.` / `"form" should be a submit event, a form element, FormData, or an object.` |
| `INVALID_PARAMETER` | `Multipart body is too large: <n> bytes once base64 encoded, and the limit is 2031616. Upload the file first and send its url instead.` |
| `INVALID_REQUEST` | `Data should not exceed 2MB` (`form`) |
| `INVALID_REQUEST` | `Invalid clientSecretName.` / `No access to client secret.` (a locked secret and no signed-in user, or a lower access group) |
| `INVALID_REQUEST` | a URL the secret's destinations do not allow |
| `INVALID_REQUEST` | `Invalid queue name. Queue names cannot contain colons.` |
| `ERROR` | the destination could not be reached (inline request) |

An error answer from the destination is not raised: inline it is returned as the answer, queued it is the `failed` result below.

## forward_request_poll

```python
skapi.forward_request_poll(request_id: str, *, poll: float = 1000, url: str | None = None, method: str | None = None,
                           on_stream: Callable[[str, int], None] | None = None,
                           service: str | None = None, owner: str | None = None, notify: bool = False) -> Any
```

Waits for a queued request and returns its result. The first check goes out after `poll` milliseconds (`0` means 1000). A value under 1000 is refused with `INVALID_PARAMETER`. It blocks until the request settles; there is no time limit. With `on_stream`, new text of a streamed request is handed over as it arrives.

Only the server's own answer ends the wait. A check that fails on the way (`NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR`, `ABORTED`, or a sign-in token that could not be had) is tried again later: at the next interval after the first failure, then twice as long each time, up to 30 seconds. A `401` from the gateway refreshes the sign-in token once and the wait goes on. When the user signs out while it waits, it waits for a sign in. A refusal from the server, such as `NOT_EXISTS`, is raised.

| argument | |
|---|---|
| `request_id` | The `request_id`, or the short `id` with `url` and `method`. |
| `poll` | Milliseconds between checks, 1000 or more (`0` means 1000). |
| `url`, `method` | Needed with a short `id`. |
| `on_stream` | `(text, seq)` for a streamed request. |
| `notify` | `True` for a request sent with `notify` (the reply said `"notify": True`): it is read at once when a status change of it arrives, and otherwise once a minute while status changes are arriving. Without them it is read every `poll` as usual. |

Returns:

| the request | returns |
|---|---|
| `resolved` | the destination's answer (or the finalized value of a streamed request) |
| `failed` | `{"status_code": int, "body": str, "truncated": ...}`, or another error dict such as `{"message", ...}` |
| `cancelled` | the envelope, `"status": "cancelled"` |
| streamed, not finalized | the envelope: `{"id", "status", "queue_name", "in_queue", "executed"?, "responded"?}`, plus `"stream", "chunks", "last_seq", "more"` and, when failed, `"error"` with `on_stream` |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a number.` / `"poll" should be a number of milliseconds, 1000 or more.` / `"notify" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forward_request_stream

```python
skapi.forward_request_stream(request_id: str, options: dict | None = None, *,
                             on_stream: Callable[[str, int], None] | None = None) -> Any
```

Reads a streamed request, from the start or after `since`, and returns once it settles. The first read is immediate. Running: hands new text to `on_stream` until it settles, then returns the envelope. Settled, not finalized: hands over all the stored text, then returns the envelope. Finalized: returns the kept value. After three degraded reads in a row on a settled request it returns what it has. A read that fails on the way is tried again, with the same rules as [forward_request_poll](#forward-request-poll).

| option key | type | |
|---|---|---|
| `url`, `method` | str | Needed with a short `id`. |
| `since` | int | Start after this `seq`. |
| `poll` | int or float | Milliseconds between reads while it runs, 1000 or more. Default 1000. |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` / `"since" should be a number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forward_request_finalize

```python
skapi.forward_request_finalize(request_id: str, data: Any = None, options: dict | None = None) -> dict
```

Stores `data` as a settled streamed request's answer and releases its pieces. Later polls return `data`; [forward_request_history](#forward-request-history) lists it as `response_body`. Calling it again replaces the value. Without `data`, `None` is stored.

| option key | type | |
|---|---|---|
| `url`, `method` | str | Needed with a short `id`. |
| `if_absent` | bool | Store only when no answer is stored yet. When one is, nothing changes and the answer is `{"finalized": False, "reason": "exists", ...}`, so two programs settling the same request cannot replace a complete answer with a partial one. |

Returns `{"finalized": bool, "message": str, "reason"?: str}`. These come back with `finalized: False` instead of raising:

| message | |
|---|---|
| `Finalized.` | done |
| `Request not found.` | no such request for this caller |
| `The request has not finished yet.` | it is still `pending` or `running` |
| `The request was not sent with stream, so its response is already stored.` | not a streamed request |
| `The request changed while it was being finalized. Try again.` | |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"if_absent" should be type: <boolean>.` |

## forward_request_history

```python
skapi.forward_request_history(params: dict, fetch_options: dict | None = None) -> dict
```

Your forwarded requests to one URL and method. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`; see [Paging](/database/fetch#paging). The server sends up to 100 at a time.

| key | type | |
|---|---|---|
| `url` | str | Required, as it was sent. |
| `method` | str | Required, upper case: `"GET"`, `"POST"`, `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"`. |
| `status` | str | `"pending"`, `"running"`, `"resolved"` or `"failed"`. |
| `queue` | str | Requests in queues whose name starts with this. |
| `queue_exact` | bool | Only the queue named in `queue`. Requests queued before 2026-06-05 are not listed with it (see below). |
| `queue_exclude` | str | Leave out this queue. Applied after the read, so a page can come back short while more remain. |
| `compact` | bool | Leave the bodies out; give `request_text`, `response_text`, `response_complete_marker` and `compact: True` instead. |
| `fields` | `"ids"` | A light listing: each item is only its id, status, times, queue and `cref`, with no bodies. |
| `after` | str | Only requests newer than this short id (`"<stamp>:<entropy>"`). |
| `deadline` | int or float | Milliseconds the call may take in all; past it, it raises `TIMEOUT`. |
| `signal` | `threading.Event` | Once set, the call raises `ABORTED`. |
| `fresh` | bool | Accepted for skapi-js code; every skapi-py read is already fresh (it never joins another read). |

A page that `deadline` or `signal` gave up on does not count for `fetchMore`: the same call with `fetchMore` asks for that page again.

With `queue_exact`, the server reads only the named queue. Requests queued before 2026-06-05 were stored under an older queue format and are not listed with `queue_exact: True`; list the queue without it to see those.

Each item has `id`, `status_code`, `response_body` and `request_id`; the other keys are there when the server stored them:

| key | |
|---|---|
| `id` | the short id |
| `status_code` | the destination's status code, or `None` |
| `response_body` | the answer as stored, text (not parsed), or `None` |
| `error` | the error of a failed request |
| `created`, `updated` | milliseconds |
| `executed` | when it began running, milliseconds |
| `responded` | when the answer finished arriving, milliseconds |
| `request_body` | the `data` or `params` sent |
| `expires` | when it leaves the history |
| `status` | `"pending"`, `"running"`, `"resolved"`, `"failed"` or `"cancelled"` |
| `queue_name` | |
| `cref` | the `cref` it was sent with |
| `request_id` | for [forward_request_poll](#forward-request-poll) |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "url". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |
| `INVALID_PARAMETER` | `<value> is invalid in "status". allowed types or values are: "pending", "running", "resolved", "failed".` |
| `INVALID_PARAMETER` | `<value> is invalid in "compact". allowed type or value is: Type<boolean>.` (also `"queue_exact"`) |
| `INVALID_PARAMETER` | `"fields" should be "ids".` / `<value> is invalid in "after". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` / `"signal" should be a threading.Event.` |
| `TIMEOUT` | `No answer within <deadline> ms.` |
| `ABORTED` | `Aborted` |

## cancel_forward_request

```python
skapi.cancel_forward_request(params: dict) -> dict
```

Cancels a request that is still `pending` or `running`; it stays in the history as `cancelled`. A streamed request's pieces are discarded. `params`: `url`, `method` (upper case) and `id` (the short id), all required.

Returns `{"removed": bool, "message": str}`: `Cancelled.`, `Request not found.` or `The request has already been processed.`

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` / `Key "id" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |

## forward_request_queue_count

```python
skapi.forward_request_queue_count(params: dict) -> dict
```

How many requests wait in one queue. Signed-in users only. `params`: `{"queue": str}`.

Returns `{"queue_name": str, "in_queue": int}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"queue" is required.` |
| `INVALID_REQUEST` | `User login is required.` |

## forward_request_status

```python
skapi.forward_request_status(requests: list, *, service: str | None = None, owner: str | None = None,
                             deadline: float | None = None, fresh: bool | None = None,
                             signal: threading.Event | None = None) -> dict
```

Where many forwarded requests stand, in one call per 100 requests (more are sent 100 at a time, one call after another). No bodies, and a strongly consistent read: a request that just changed shows its new status. Made for checking many unfinished requests at once, for example after the machine slept.

| argument | |
|---|---|
| `requests` | Full `request_id`s, or `{"id", "url", "method"}` dicts with the short id. |
| `deadline` | Milliseconds each call may take in all; past it, `TIMEOUT`. |
| `signal` | A `threading.Event`; once set, `ABORTED`. |
| `fresh` | Accepted for skapi-js code; the read is always fresh. |

Returns `{"list": [...]}` in the order asked (anything else the server reports beside the list is kept). Each item:

| key | |
|---|---|
| `id` | the short id |
| `status` | `"pending"`, `"running"`, `"resolved"`, `"failed"`, `"cancelled"`, or `"missing"` when there is no such request for this caller (never sent, expired, deleted, or someone else's) |
| `queue` | |
| `stream` | `True` for a request sent with `stream` |
| `final_seq` | the last piece's `seq`, written when a streamed request settles: a reader is done once its cursor reaches it |
| `has_body` | an answer is stored (read it with [forward_request_read](#forward-request-read)) |
| `created`, `updated`, `executed`, `responded` | milliseconds |
| `cref` | the `cref` it was sent with |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"requests" should be an array of request ids or { id, url, method }.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` / `"signal" should be a threading.Event.` |
| `TIMEOUT` | `No answer within <deadline> ms.` |
| `ABORTED` | `Aborted` |

## forward_request_queue_counters

```python
skapi.forward_request_queue_counters(queues: list, *, service: str | None = None, owner: str | None = None,
                                     deadline: float | None = None, fresh: bool | None = None,
                                     signal: threading.Event | None = None) -> dict
```

The counters of up to 20 queues, a few bytes each. `rct` grows when a request on the queue finishes and `seq` when one is added: read these on every check, and read the requests themselves ([forward_request_status](#forward-request-status)) only when a counter moved. A queue that never had a request is left out. `deadline`, `signal` and `fresh` as for [forward_request_status](#forward-request-status).

Returns `{"queues": {"<name>": {"cnt": int, "rct": int, "seq": int, "in_queue": int}}}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"queues" should be an array of 1 to 20 queue names.` (a name cannot be empty or contain a colon) |
| `TIMEOUT` / `ABORTED` | as for [forward_request_status](#forward-request-status) |

## forward_request_read

```python
skapi.forward_request_read(request_id: str, *, url: str | None = None, method: str | None = None,
                           since: int | None = None, service: str | None = None, owner: str | None = None,
                           deadline: float | None = None, fresh: bool | None = None,
                           signal: threading.Event | None = None) -> dict
```

Reads one forwarded request in full, always in the same shape whatever state it is in. Unlike [forward_request_poll](#forward-request-poll), a resolved request does not come back as its bare answer, so the status is always there to read. With `since` (a piece's `seq`, `0` for the beginning) a streamed request's text after that point comes back too, including the text a failed stream got before it failed. `deadline`, `signal` and `fresh` as for [forward_request_status](#forward-request-status).

Returns:

| key | |
|---|---|
| `id`, `status` | as in [forward_request_status](#forward-request-status) |
| `body` | the stored answer: the destination's answer, or what [forward_request_finalize](#forward-request-finalize) kept |
| `error` | why it failed |
| `body_unavailable` | `True`: an answer is stored but could not be loaded this time; read again later |
| `stream` | `True` for a streamed request |
| `chunks` | with `since`: `[{"seq", "txt"}]` after `since`, oldest first |
| `last_seq`, `final_seq` | how far the stream has got, and its last `seq` once settled |
| `more` | more pieces are stored than this read returned: read again from the new cursor |
| `created`, `updated`, `executed`, `responded`, `cref` | |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"since" should be a number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `TIMEOUT` / `ABORTED` | as for [forward_request_status](#forward-request-status) |

## on_request_status

```python
skapi.on_request_status(callback: Callable[[dict], None]) -> Callable[[], None]
```

Listens to status changes of the signed-in user's requests sent with `notify`, including ones this program holds no poll for (a request the server queued as the continuation of one, or a request sent from another device). Returns a function that removes the listener. `callback` runs on a background thread with one of:

```python
{"type": "status", "id": "<stamp>:<entropy>", "queue": "...", "status": "running",
 "previous": "pending", "updated": 1764000000000, "executed": 1764000000000}
{"type": "connected"}      # the listener is on an open connection: first time and after every reconnect
{"type": "disconnected"}   # the connection was lost
```

`previous` is absent for a request that was just created, `executed` until it starts running. Status changes are not kept for a connection that is down, so read again what you show on `"connected"`. A status change is a hint, not the outcome: read the request for that.

While a listener (or a poll with `notify`) is active, the realtime connection is kept open: when your program has none and a user is signed in, one is opened, and it is closed 10 minutes after the last listener and poll let go (never one your program opened, and never while a group is joined). These messages never reach your [connect_realtime](/api-reference/realtime#connect-realtime) callback.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Callback must be a function.` |

## is_request_status_live

```python
skapi.is_request_status_live() -> bool
```

`True` while status changes are arriving: the server accepted `notify`, the connection is open, and a status change came in on it. Only then do polls with `notify` slow down.
