# Forwarding Requests

[forward_request](/api-reference/api-bridge#forward-request) calls another API from Skapi's server instead of from your code. Use it when the call needs a key you do not want to ship with your app, when its answer should be kept and read again later, or when you want the answer streamed as it arrives.

Answers arrive by polling. A Python call that waits for an answer blocks until that answer is ready.

## Sending a request

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

answer = skapi.forward_request({
    "url": "https://api.example.com/v1/report",
    "method": "POST",
    "headers": {"Content-Type": "application/json"},
    "data": {"report": "quarterly"},
})
```

| option | |
|---|---|
| `url` | Required. A full URL. |
| `method` | `"GET"`, `"POST"` (default), `"PUT"`, `"PATCH"`, `"DELETE"` or `"HEAD"`, any case. |
| `headers` | dict. A name starting with `x-skapi-` is refused. |
| `data` | dict, the body. Sent as JSON only when your `Content-Type` header is `application/json`, otherwise form-encoded. |
| `params` | dict, the query string. A `?query` in `url` is added to it. |
| `secretName` | A client secret to fill in, see below. |
| `skapiHeaders` | Tell the destination who is calling, see below. |
| `queue`, `poll`, `stream`, `expires` | See [Queued requests](#queued-requests) and [Streamed requests](#streamed-requests). |
| `cref` | Your own reference for the request, see [Finding a request whose reply was lost](#finding-a-request-whose-reply-was-lost). |
| `notify` | Status push for a queued request, see [Status push with notify](#status-push-with-notify). |
| `multipart` | `True` sends `form` as a multipart body, see below. |
| `responseType` | `"json"` parses a str answer (a str that does not parse comes back unchanged); `"text"` gives a str, turning anything else into JSON text. |

The second argument, `form`, is a dict merged into `data` (or into `params` for `GET`, `DELETE` and `HEAD`). Where `form` and the option hold the same key, the option wins.

```python
skapi.forward_request({"url": "https://api.example.com/search", "method": "GET"}, {"q": "otter"})
```

Signing in is not required. A signed-out caller is known to the server by IP address and User-Agent only (see [Reading an answer later](#reading-an-answer-later)).

## Client secrets

Store the key on skapi.com as a client secret of your project, name it with `secretName`, and put `"$CLIENT_SECRET"` where the value goes: in `url`, or in any string value of `headers`, `data` or `params`, at any depth.

```python
answer = skapi.forward_request({
    "secretName": "my_secret",
    "url": "https://api.example.com/v1/report",
    "headers": {
        "Content-Type": "application/json",
        "Authorization": "Bearer $CLIENT_SECRET",
    },
    "data": {"report": "quarterly"},
})
```

The value is filled in on the server, so it never reaches your code. A locked secret needs a signed-in user whose access group reaches the secret's, and a secret limited to some destinations refuses other URLs. When `"$CLIENT_SECRET"` appears nowhere, skapi-py leaves `secretName` out and sends the request as written.

`"$ACCESS_TOKEN"` works the same way, without a secret: the server replaces it with the signed-in user's access token, or with nothing when signed out.

## Telling the destination who is calling

`skapiHeaders` is off by default.

| value | the destination receives |
|---|---|
| `True` | `x-skapi-user` and `x-skapi-service` |
| `{"user": True}` | `x-skapi-user`: the signed-in user's ID, left out when signed out |
| `{"service": True}` | `x-skapi-service`: the project's ID |

Skapi's server writes these from the verified caller, so the destination can trust them. That is why your own `x-skapi-` headers are refused.

## Multipart bodies

`multipart: True` sends `form` as a `multipart/form-data` body. A file is a dict like on [Files](/database/files#uploading-with-a-record): `{"file": path, bytes or file object, "filename"?, "content_type"?}`. `bytes` alone also becomes a file part. A list gives one part per item; other values are sent as text (`None` as empty, `True` as `true`, dicts and lists as JSON).

```python
skapi.forward_request(
    {
        "secretName": "my_secret",
        "url": "https://api.example.com/v1/upload",
        "headers": {"Authorization": "Bearer $CLIENT_SECRET"},
        "multipart": True,
    },
    {"title": "Holiday", "photo": {"file": "./beach.jpg"}},
)
```

`data` cannot be sent with `multipart`. Nothing is filled in inside a multipart body. The body is capped at 2,031,616 characters once base64 encoded, about 1.5 MB of file: upload bigger files first and send their URL.

## Three ways to get the answer

| you pass | what happens | `forward_request` returns |
|---|---|---|
| no `queue`, `poll` or `stream` | **inline**: the destination is called at once | its answer |
| `queue`, no `poll` | **queued**: the request waits its turn on the server | the envelope, at once |
| `poll` or `stream=True` | **queued**, then polled | the answer, when it is ready |

Inline answers come back as text or parsed JSON. The destination's status code is not returned, so an error answer comes back like any other; its status code is in [forward_request_history](#request-history). Inline requests must be answered within about 29 seconds; queue anything slower.

## Queued requests

```python
env = skapi.forward_request({
    "secretName": "openai",
    "url": "https://api.openai.com/v1/images/generations",
    "headers": {"Content-Type": "application/json", "Authorization": "Bearer $CLIENT_SECRET"},
    "data": {"model": "gpt-image-1", "prompt": "A sea otter", "n": 1},
    "queue": "images",
})
```

The envelope:

```python
{
    "id": "<stamp>:<entropy>",    # the short id
    "status": "pending",
    "queue_name": "images",
    "in_queue": 1,                # place in the queue, this request included; 1 = next
    "request_id": "[POST]https://api.openai.com/v1/images/generations#<project id>:<stamp>:<entropy>",
}
```

Keep `request_id`: it is how you read the answer. Queue names cannot contain colons. `expires` (seconds) removes the request from the history that long after it settles.

`poll` (milliseconds between checks, 1000 or more; `True` for 1000) does the waiting for you. A queue name is made up when you give none.

```python
result = skapi.forward_request({
    "url": "https://api.example.com/v1/slow-report",
    "data": {"report": "yearly"},
    "poll": 2000,
})
```

The first check goes out after one interval. There is no time limit: the call returns when the request settles. Run it in a thread if you need to do other work meanwhile.

What a settled request returns:

- `resolved`: the destination's answer, as it is. An answer with a `"status"` key of its own (even `"pending"`) is returned, not waited on: only Skapi's envelope, which has `in_queue`, means the request is still waiting. The same goes for `"chunks"` or `"more"` in the answer: they are the destination's data, never handed to `on_stream` as streamed text.
- `failed` with an error answer (status 400 or above): `{"status_code": int, "body": str, "truncated": ...}`. This is returned, not raised.
- `cancelled`: the envelope with `"status": "cancelled"`.

## Reading an answer later

[forward_request_poll](/api-reference/api-bridge#forward-request-poll) waits for a queued request and returns the same values:

```python
result = skapi.forward_request_poll(env["request_id"], poll=2000)

# or with the short id
result = skapi.forward_request_poll(env["id"], url="https://api.openai.com/v1/images/generations", method="POST")
```

Only the caller who made a request can read it. A signed-in caller is the user, on any machine. A signed-out caller is the IP address and User-Agent pair, so a request made signed out must be polled, cancelled and finalized from the same IP with the same User-Agent; otherwise it is `NOT_EXISTS` (`Request not found.`).

### When a read fails

A wait ends only with the server's own answer. A check that fails on the way (no network, `TIMEOUT`, a `429`, a server fault, a sign-in token refresh that got no answer) is tried again: at the next interval after the first failure, then twice as long each time, up to 30 seconds. So a machine that sleeps or loses the network while it waits picks up where it left off. A `401` refreshes the sign-in token once and the wait goes on. If the user signs out while it waits, it waits for a sign in. A refusal from the server still ends it, and a request that no longer exists raises `NOT_EXISTS`. [forward_request_stream](/api-reference/api-bridge#forward-request-stream) follows the same rules.

### Reading many requests at once

[forward_request_status](/api-reference/api-bridge#forward-request-status) says where many requests stand in one call per 100: status, stream position, whether an answer is stored, timestamps and `cref`, with no bodies. A request you cannot see comes back as `"missing"` instead of failing the call.

```python
res = skapi.forward_request_status([env["request_id"], other_request_id], deadline=15000)
for item in res["list"]:
    print(item["id"], item["status"])
```

To check many requests often, read the counters of their queues with [forward_request_queue_counters](/api-reference/api-bridge#forward-request-queue-counters) (a few bytes each), and read the requests only when a counter moved: `rct` grows when a request on the queue finishes, `seq` when one is added.

```python
before = skapi.forward_request_queue_counters(["images"])["queues"].get("images")
# ... later
now = skapi.forward_request_queue_counters(["images"])["queues"].get("images")
if now != before:
    res = skapi.forward_request_status(unfinished_ids)
```

[forward_request_read](/api-reference/api-bridge#forward-request-read) reads one request and always answers `{"id", "status", "body"?, "error"?, "chunks"?, ...}`, so the status is there even for a resolved request. With `since` it also returns a streamed request's text, including what a failed stream got before it failed.

```python
res = skapi.forward_request_read(env["id"], url="https://api.openai.com/v1/images/generations", method="POST")
if res["status"] == "resolved":
    print(res["body"])
```

These reads take `deadline` (milliseconds the call may take in all, then `TIMEOUT`) and `signal` (a `threading.Event`; once set, the call raises `ABORTED`). So does [forward_request_history](/api-reference/api-bridge#forward-request-history). The call stops waiting at once; a request already on its way finishes in the background and its answer is dropped. A dropped history page is not counted for `fetchMore`, so the next call with `fetchMore` asks for it again.

### Finding a request whose reply was lost

If the network drops while `forward_request` waits for its reply, you cannot tell whether the request reached the server. Send your own reference with it as `cref` (1 to 64 letters, digits, `_` or `-`, a new one per request), and look for it before sending again:

```python
import uuid

ref = uuid.uuid4().hex
try:
    env = skapi.forward_request({"url": url, "data": data, "queue": "images", "cref": ref})
except SkapiError as err:
    if err.code not in ("NETWORK_ERROR", "TIMEOUT"):
        raise
    # newest first: the history lists oldest first by default, 100 at a time
    listing = skapi.forward_request_history(
        {"url": url, "method": "POST", "queue": "images", "fields": "ids"},
        {"ascending": False})
    sent = [item for item in listing["list"] if item.get("cref") == ref]
```

The listing is read newest first, so the request you just sent is on the first page even when the queue has a long history.

The reply, [forward_request_history](/api-reference/api-bridge#forward-request-history), [forward_request_status](/api-reference/api-bridge#forward-request-status) and [forward_request_read](/api-reference/api-bridge#forward-request-read) all hand `cref` back.

### Status push with notify

`"notify": True` on a queued request of a signed-in user sends each status change of it (pending, running, resolved, failed, cancelled) over the user's realtime connection. Its poll then reads the request when a change arrives, and otherwise once a minute, instead of at every interval. The reply says `"notify": True` when the server accepted it; with an older server, or no connection, the poll simply runs at its interval.

```python
answer = skapi.forward_request({"url": url, "data": data, "queue": "images", "notify": True, "poll": 1000})

# or wait for it later
env = skapi.forward_request({"url": url, "data": data, "queue": "images", "notify": True})
answer = skapi.forward_request_poll(env["request_id"], notify=env.get("notify", False))
```

[on_request_status](/api-reference/api-bridge#on-request-status) listens to these changes, also for requests this program holds no poll for:

```python
def on_status(event):
    if event["type"] == "status":
        print(event["id"], event.get("previous"), "->", event["status"])
    elif event["type"] == "connected":
        pass  # changes are not kept while the connection is down: read again what you show

stop = skapi.on_request_status(on_status)
# ... later
stop()
```

A status change is a hint, not the outcome: read the request for that. When your program has no realtime connection and a user is signed in, one is opened for this and closed 10 minutes after the last listener and poll let go. These messages never reach your own [connect_realtime](/api-reference/realtime#connect-realtime) callback. [is_request_status_live](/api-reference/api-bridge#is-request-status-live) says whether changes are arriving.

## Streamed requests

`stream=True` makes Skapi relay the destination's answer as it arrives, and `on_stream(text, seq)` receives each piece in order. Pieces end wherever the destination paused, so buffer them until your own format says a unit is complete. An exception raised in `on_stream` is ignored.

Ask the destination for a streamed answer too: that is part of your own `data`, and Skapi never reads it.

```python
import json

buffer, answer = "", []

def on_stream(text, seq):
    global buffer
    buffer += text
    *frames, buffer = buffer.split("\n\n")
    for frame in frames:
        for line in frame.split("\n"):
            if line.startswith("data: ") and line[6:] != "[DONE]":
                answer.append(json.loads(line[6:])["choices"][0]["delta"].get("content") or "")

env = skapi.forward_request(
    {
        "secretName": "openai",
        "url": "https://api.openai.com/v1/chat/completions",
        "headers": {"Content-Type": "application/json", "Authorization": "Bearer $CLIENT_SECRET"},
        "data": {"model": "gpt-4.1", "stream": True, "messages": [{"role": "user", "content": "Hi"}]},
        "stream": True,    # Skapi's own flag
    },
    on_stream=on_stream,
)
print(env["status"])   # "resolved"
```

A streamed request settles with the envelope and no body, and with `on_stream` the envelope also carries `stream`, `chunks`, `last_seq` and `more`. A failed one has `"status": "failed"` and an `error` dict, and keeps the text that did arrive (without `on_stream` you get the `error` dict alone). It is not raised.

### Reading a stream again

[forward_request_stream](/api-reference/api-bridge#forward-request-stream) reads a streamed request from the start, or after `since`: while it runs it hands new text to `on_stream`; once it has settled it hands over all the stored text and returns the envelope; once it is finalized it returns the kept body.

```python
skapi.forward_request_stream(request_id, {"poll": 1000}, on_stream=on_stream)
```

### Keeping the answer

Until you finalize it, a streamed request keeps every piece and its history has no answer. [forward_request_finalize](/api-reference/api-bridge#forward-request-finalize) stores what you pass as its answer and releases the pieces; later polls return that value. Finalizing again replaces it. Calling it without `data` stores `None` and still releases the pieces.

```python
skapi.forward_request_finalize(request_id, "".join(answer))
# {"finalized": True, "message": "Finalized."}
```

Only a settled request can be finalized. After three failed reads of the pieces in a row on a settled request, the read gives up and returns what it has, so check your text is complete before you finalize it.

When more than one program may settle the same request, pass `{"if_absent": True}`: the answer is stored only when none is stored yet, and otherwise nothing changes and you get `{"finalized": False, "reason": "exists", ...}`. A complete answer is never replaced by a partial one.

```python
skapi.forward_request_finalize(request_id, "".join(answer), {"if_absent": True})
```

## Request history

[forward_request_history](/api-reference/api-bridge#forward-request-history) lists your requests to one `url` and `method` (upper case), with their answers. Only your own requests are listed, also when you name a queue: another user's requests on a queue with the same name never appear. For example:

```python
history = skapi.forward_request_history({
    "url": "https://api.openai.com/v1/images/generations",
    "method": "POST",
    "status": "pending",       # optional: "pending", "running", "resolved", "failed"
    "queue": "images",         # optional, matches as a prefix; add "queue_exact": True for this queue only
})

for item in history["list"]:
    print(item["status"], item["status_code"], item["created"])
    if item["status"] in ("pending", "running"):
        print(skapi.forward_request_poll(item["request_id"]))
```

`compact: True` leaves the bodies out and gives short `request_text` and `response_text` instead. `fields: "ids"` is lighter still: each item is only its id, status, times, queue and `cref`. `after: "<stamp>:<entropy>"` lists only requests newer than that one, which is how you pick up what appeared since the newest request you already know. The listing pages like [get_records](/database/fetch#paging).

With `queue_exact: True` the server reads only that queue. Requests queued before 2026-06-05 were stored under an older queue format and are not listed with it: list the queue without `queue_exact` to see those. `queue_exclude: "<name>"` leaves one queue out; it is applied after the read, so a page can come back short while more remain, so keep paging.

## Cancelling and counting

```python
skapi.cancel_forward_request({"url": "https://api.openai.com/v1/images/generations", "method": "POST", "id": env["id"]})
# {"removed": True, "message": "Cancelled."}

skapi.forward_request_queue_count({"queue": "images"})
# {"queue_name": "images", "in_queue": 3}   signed-in users only
```

Cancel takes the short `id`, and only reaches a request that is still `pending` or `running`. Cancelling a streamed request discards its pieces.
