# API Bridge

Every method raises [`SkapiError`](/introduction/errors) with a `code` and a `message`. Values that fail a check raise `INVALID_PARAMETER` before anything is sent. Any method can raise `NETWORK_ERROR` when no answer comes back. See [Forwarding Requests](/api-bridge/forward-request).

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
| `poll` | int, float or bool | Milliseconds between checks (`True` = 1000). Waits for the answer; makes a queue name when none is given. |
| `stream` | bool | Relay the answer as it arrives. Queued and polled like `poll`. |
| `expires` | int | Seconds the request stays in the history after it settles. |
| `multipart` | bool | Send `form` as `multipart/form-data`. Files are `{"file", "filename"?, "content_type"?}` dicts or `bytes`. |
| `responseType` | `"json"` or `"text"` | Reshapes the answer. An envelope is returned unchanged. |

`"$ACCESS_TOKEN"` anywhere in `url`, `headers`, `data` or `params` becomes the signed-in user's access token (empty when signed out).

Returns:

- no `queue`, `poll` or `stream`: the destination's answer, parsed JSON or text, even when it looks like `{"status": "pending", "id": ...}`. Its status code is not returned.
- `queue` without `poll`: `{"id", "status": "pending", "queue_name", "in_queue", "request_id"}`.
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
| `INVALID_PARAMETER` | `"stream" should be type: <boolean>.` / `"multipart" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `"poll" should be a non-negative number.` |
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
                           on_stream: Callable[[str, int], None] | None = None) -> Any
```

Waits for a queued request and returns its result. The first check goes out after `poll` milliseconds (`0` means 1000). It blocks until the request settles; there is no time limit. With `on_stream`, new text of a streamed request is handed over as it arrives.

| argument | |
|---|---|
| `request_id` | The `request_id`, or the short `id` with `url` and `method`. |
| `poll` | Milliseconds between checks. |
| `url`, `method` | Needed with a short `id`. |
| `on_stream` | `(text, seq)` for a streamed request. |

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
| `INVALID_PARAMETER` | `"poll" should be a number.` / `"poll" should be a non-negative number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forward_request_stream

```python
skapi.forward_request_stream(request_id: str, options: dict | None = None, *,
                             on_stream: Callable[[str, int], None] | None = None) -> Any
```

Reads a streamed request, from the start or after `since`, and returns once it settles. The first read is immediate. Running: hands new text to `on_stream` until it settles, then returns the envelope. Settled, not finalized: hands over all the stored text, then returns the envelope. Finalized: returns the kept value. After three degraded reads in a row on a settled request it returns what it has.

| option key | type | |
|---|---|---|
| `url`, `method` | str | Needed with a short `id`. |
| `since` | int | Start after this `seq`. |
| `poll` | int or float | Milliseconds between reads while it runs. Default 1000. |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a non-negative number.` / `"since" should be a number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forward_request_finalize

```python
skapi.forward_request_finalize(request_id: str, data: Any = None, options: dict | None = None) -> dict
```

Stores `data` as a settled streamed request's answer and releases its pieces. Later polls return `data`; [forward_request_history](#forward-request-history) lists it as `response_body`. Calling it again replaces the value. Without `data`, `None` is stored. `options`: `url` and `method`, needed with a short `id`.

Returns `{"finalized": bool, "message": str}`. These come back with `finalized: False` instead of raising:

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
| `queue_exact` | bool | Only the queue named in `queue`. |
| `queue_exclude` | str | Leave out this queue. |
| `compact` | bool | Leave the bodies out; give `request_text`, `response_text`, `response_complete_marker` and `compact: True` instead. |

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
| `request_id` | for [forward_request_poll](#forward-request-poll) |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "url". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |
| `INVALID_PARAMETER` | `<value> is invalid in "status". allowed types or values are: "pending", "running", "resolved", "failed".` |
| `INVALID_PARAMETER` | `<value> is invalid in "compact". allowed type or value is: Type<boolean>.` (also `"queue_exact"`) |

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
