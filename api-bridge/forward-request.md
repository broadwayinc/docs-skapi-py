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

## Request history

[forward_request_history](/api-reference/api-bridge#forward-request-history) lists your requests to one `url` and `method` (upper case), with their answers:

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

`compact: True` leaves the bodies out and gives short `request_text` and `response_text` instead. The listing pages like [get_records](/database/fetch#paging).

## Cancelling and counting

```python
skapi.cancel_forward_request({"url": "https://api.openai.com/v1/images/generations", "method": "POST", "id": env["id"]})
# {"removed": True, "message": "Cancelled."}

skapi.forward_request_queue_count({"queue": "images"})
# {"queue_name": "images", "in_queue": 3}   signed-in users only
```

Cancel takes the short `id`, and only reaches a request that is still `pending` or `running`. Cancelling a streamed request discards its pieces.
