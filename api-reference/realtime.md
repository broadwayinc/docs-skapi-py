# Realtime

See [Connecting to Realtime](/realtime/connecting) and [Groups and Messages](/realtime/groups). Every method raises [`SkapiError`](/introduction/errors).

## connect_realtime

```python
skapi.connect_realtime(callback) -> None
```

Opens the realtime connection and returns once it is open. `callback(event)` runs on a background thread for every event; see [Events](/realtime/connecting#events). Called again while connected, it only swaps the callback. Called while another connect is still opening, it waits for that one and then does the same. The connection reopens on its own after a drop. Status changes of forwarded requests sent with `notify` never reach the callback; see [on_request_status](/api-reference/api-bridge#on-request-status).

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `Callback must be a function.` |
| `INVALID_REQUEST` | `No access.` (not signed in) |
| `INVALID_REQUEST` | `WebSocket closed before it opened.` |

## close_realtime

```python
skapi.close_realtime() -> None
```

Closes the connection. The callback gets `"close"`; the group gets `USER_DISCONNECTED` and `USER_LEFT`. Does nothing when no connection is open.

## join_realtime

```python
skapi.join_realtime(group: str | None) -> dict
```

Joins a group, leaving the current one. `None` (or `""`) leaves the group. `{"group": ...}` is accepted too.

```python
{"type": "success", "message": 'Joined realtime message group: "lobby".'}
{"type": "success", "message": "Left realtime message group."}
```

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No realtime connection. Execute connect_realtime() before this method.` |
| `INVALID_PARAMETER` | `"group" must be a string \| None.` |

## post_realtime

```python
skapi.post_realtime(message, recipient: str, notification: dict | None = None) -> dict
```

Sends any JSON value to a user (`recipient` is a user ID) or to the group you joined (`recipient` is its name). Returns `{"type": "success", "message": "Message sent."}`.

`notification`: `{"title": str, "body": str, "config"?: {"always": bool}}`, a web push for recipients in a browser. See [Notifications](/realtime/groups#notifications).

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No realtime connection. Execute connect_realtime() before this method.` |
| `INVALID_REQUEST` | `No recipient.` |
| `INVALID_REQUEST` | `User has not joined to the recipient group. Run join_realtime("<group>")` |
| `INVALID_REQUEST` | `Realtime connection is not open. Try reconnecting with connect_realtime().` (the connection is down) |
| `INVALID_PARAMETER` | `Message is <n> bytes; a realtime message can be at most 32768 bytes including its headers.` |
| `INVALID_PARAMETER` | `"notification" should be an object with "title" and "body".` / `Key "title" is required.` / `"title" should be type: <string>.` / `"config.always" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `Notification size exceeds 3kb.` |

## get_realtime_groups

```python
skapi.get_realtime_groups(params: dict | None = None, fetch_options: dict | None = None) -> dict
```

Groups that have members now: `{"list": [{"group", "number_of_users"}], ...}`. Left out, `params` lists every group.

| key | |
|---|---|
| `searchFor` | `"group"` (default) or `"number_of_users"` |
| `value` | a str for `"group"`, a number for `"number_of_users"` |
| `condition` | `">"`, `">="`, `"="`, `"<"`, `"<="`, `"!="` (or `gt`, `gte`, `eq`, `lt`, `lte`, `ne`) |
| `range` | an upper bound of the same type as `value`; replaces `condition` |

`fetch_options`: see [Paging](/database/fetch#paging).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"<value>" is invalid in "searchFor". allowed types or values are: "group", "number_of_users".` |
| `INVALID_PARAMETER` | `"<value>" is invalid in "condition". allowed types or values are: ...` |
| `INVALID_PARAMETER` | `"value" must be a number.` / `"value" must be a string.` / `"range" must be a number.` / `"range" must be a string.` |

## get_realtime_users

```python
skapi.get_realtime_users(params: dict | None = None, fetch_options: dict | None = None) -> dict
```

Connections in a group: `{"list": [{"user_id", "cid"}], ...}`.

| key | |
|---|---|
| `group` | the group; left out, the one you joined |
| `user_id` | only this user's connections |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `No group has been joined. Otherwise "group" is required.` |
| `INVALID_PARAMETER` | `"<value>" is invalid in "group". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `User ID is empty.` / `User ID is invalid.` (in `user_id`) |
