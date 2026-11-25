# Tickets

Every method raises [`SkapiError`](/introduction/errors) with a `code` and a `message`, and can raise `NETWORK_ERROR` when no answer comes back, and `TIMEOUT`, `RATE_LIMITED` or `SERVER_ERROR` for the other failures on the way (see [Errors](/introduction/errors)). See [Tickets](/tickets/tickets).

## consume_ticket

```python
skapi.consume_ticket(ticket_id: str, method: str = "POST", data: dict | None = None, auth: bool = False) -> Any
```

Calls a ticket of the project, at `https://<first 4 characters of the Project ID>.skapi.dev/`.

| argument | |
|---|---|
| `ticket_id` | Letters, digits, `_` and `-`, up to 64 characters, starting with a letter or digit. |
| `method` | `"GET"` or `"POST"`, any case. `GET` sends `data` as the query string (`/tg/` route); `POST` sends it as the JSON body (`/tp/` route). |
| `data` | The request data. Defaults to `{}`. |
| `auth` | `True` sends the call as the signed-in user (`POST /tpa/` route, with the user's token). POST only. |

Returns the receipt, or the body a Respond action of the ticket composed, as sent:

```python
{
    "ticket_id": str,
    "consume_id": str,   # base62 of the time in milliseconds, then 4 random characters
    "user_id": str,      # the user with auth=True, else "<ip>(<user agent>)"
    "is_test": False,
    "timestamp": int,    # milliseconds, read from consume_id
    "hash": str,         # proof string of the consumption
    "queued": True,      # only when the call waits for a free slot; its actions run later
    "position": int,     # with queued: place in the line, 1 = next
}
```

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Ticket ID is required.` |
| `INVALID_PARAMETER` | `Invalid "ticket_id". Use letters, digits, "_" and "-" (up to 64 chars, starting with a letter or digit).` |
| `INVALID_PARAMETER` | `Method is required. Should be either "GET" or "POST"` |
| `INVALID_PARAMETER` | `Method should be either "GET" or "POST".` |
| `INVALID_PARAMETER` | `Signed-in consumption is POST only.` |
| `INVALID_REQUEST` | `User login is required.` (`auth=True`, signed out) |
| `TICKET_BUSY` | every slot of a ticket with a concurrency limit is taken. Nothing was consumed; try again later. `cause` carries `{"concurrency", "running", "waiting", "self_calling"}` in its `detail`. |
| the ticket's code | the ticket's message. `cause` is the whole error body: `{"code", "message", "stage", "action"?, "detail"?, "ticket_id"}`. Raised whether the ticket answered 400 or 200. See [When a consumption fails](/tickets/tickets#when-a-consumption-fails). |

## get_tickets

```python
skapi.get_tickets(params: dict | None = None, fetch_options: dict | None = None) -> dict
```

The project's tickets. Signed-in users only. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`, up to 100 a page; see [Paging](/database/fetch#paging).

| key | type | |
|---|---|---|
| `ticket_id` | str | Only this ticket. |

Each row:

| key | |
|---|---|
| `ticket_id` | |
| `description` | |
| `count` | consumptions left, when the ticket has a count |
| `time_to_live` | when it expires, milliseconds, when it has one |
| `timestamp` | when it was registered, milliseconds |

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_REQUEST` | `Invalid ticket id.` (`ticket_id` contains `#` or `@`) |

## get_consumed_tickets

```python
skapi.get_consumed_tickets(params: dict | None = None, fetch_options: dict | None = None) -> dict
```

The signed-in user's own consumptions, the ones made with `auth=True`, oldest first. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`.

| key | type | |
|---|---|---|
| `ticket_id` | str | Only tickets whose ID starts with this. |

Each row:

| key | |
|---|---|
| `ticket_id`, `consume_id`, `timestamp` | as in the receipt |
| `user_id`, `reg` | the user's ID |
| `is_test` | `False` (dry runs are anonymous, so they never appear here) |
| `description` | the consumption log as JSON text, with `data`, `method`, `headers`, `ip`, `user_agent`, `timestamp` and `outcome` (`ok`, `actions`, `error`, ...) |
| `hash` | proof string of the consumption |

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
