# Connecting to Realtime

The realtime connection sends JSON between signed-in users as it happens: chat, live updates, presence. One `Skapi` object holds one connection, and it can be in one group at a time.

## Opening the connection

The user must be signed in (an [anonymous login](/authentication/anonymous) works too). [connect_realtime](/api-reference/realtime#connect-realtime) takes a callback and returns once the connection is open:

```python
from skapi import Skapi

skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

def on_realtime(rt):
    print(rt["type"], rt.get("sender"), rt.get("message"))

skapi.connect_realtime(on_realtime)
```

The callback runs on a background thread, once for every event. Those threads are daemon threads, so they end when your program ends: a script that only listens has to keep its main thread alive.

```python
import time

while True:
    time.sleep(1)
```

Calling `connect_realtime` again while connected only swaps the callback.

## Events

Every event is a dict:

```python
{
    "type": "message" | "private" | "notice" | "success" | "error" | "reconnect" | "close",
    "message": ...,       # the JSON value that was sent, or a status text
    "sender": "...",      # user ID of the sender (message, private, notice)
    "sender_cid": "...",  # connection ID of the sender, "cid:..."
    "sender_rid": "...",  # the group it came through
    "code": None | "USER_JOINED" | "USER_LEFT" | "USER_DISCONNECTED",   # notices
}
```

| type | |
|---|---|
| `"message"` | a message posted to the group you are in |
| `"private"` | a message sent to you by user ID |
| `"notice"` | someone joined, left or was disconnected from your group; `sender` is that user. A disconnect comes as `USER_DISCONNECTED` followed by `USER_LEFT`. |
| `"success"` | the connection is open: the first time, and after each successful reconnect |
| `"error"` | the connection dropped (`"Skapi: WebSocket unexpected close."`), or could not reopen because the user signed out |
| `"reconnect"` | an attempt to reopen the connection follows, one event per attempt |
| `"close"` | you closed the connection |

Connection events (`success`, `error`, `reconnect`, `close`) carry only `type` and `message`.

## Staying connected

A dropped connection is reopened by skapi-py on its own: after 3 seconds, then 6, 12 and 24, then every 30 seconds, for as long as the user is signed in. The group you were in is joined again. The waits vary a little from client to client, so a service coming back from an outage is not hit by every client in the same second.

A connection that dies without closing is caught too. skapi-py checks it once a minute; ten seconds without an answer after a check counts as a drop.

The server closes every connection two hours after it opened. A few minutes before that, skapi-py opens a fresh one and switches to it, joining the group again, and your callback hears nothing about it.

A message posted while the connection is down is not queued: [post_realtime](/api-reference/realtime#post-realtime) raises `INVALID_REQUEST`, so keep the message until `"success"` comes back. After a reconnect the server gives the connection a new connection ID.

## Closing the connection

```python
skapi.close_realtime()
```

Your callback gets `"close"`, and the other members of your group get `USER_DISCONNECTED` and `USER_LEFT` for you. [logout](/api-reference/authentication#logout) closes the connection too.
