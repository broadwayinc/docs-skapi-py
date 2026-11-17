# Tickets

A ticket is an endpoint of your project that runs actions when it is called: post a record, change a user's access group, send an e-mail, call another API. Each call is a **consumption**. Tickets, their conditions and their actions are set up on skapi.com.

## Calling a ticket

[consume_ticket](/api-reference/tickets#consume-ticket) calls a ticket with `data`:

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

# anonymous GET: data becomes the query string
coupon = skapi.consume_ticket("launch-coupon", "GET", {"code": "LAUNCH24"})

# anonymous POST: data is the JSON body
skapi.consume_ticket("order-note", "POST", {"order": "A-1001"})

# signed in: the consumer is the user
skapi.login("user@example.com", "password")
unlocked = skapi.consume_ticket("unlock-guide", "POST", auth=True)
```

The route depends on `method` and `auth`:

| call | route | consumer |
|---|---|---|
| `method="GET"` | `GET /tg/<project id>/<ticket_id>` | IP address and User-Agent |
| `method="POST"` (default) | `POST /tp/<project id>/<ticket_id>` | IP address and User-Agent |
| `auth=True` | `POST /tpa/<project id>/<ticket_id>`, with the user's token | the signed-in user |

A GET sends `data` as the query string (values that are not str go in as compact JSON); a POST sends it as the JSON body. `auth=True` is POST only, and it is the only call that carries a user: a ticket's per-user limit, its user conditions and its record access condition see only this.

The request also carries `Accept`, `Content-Type: application/json`, the SDK's `Content-Meta` header and Python's own `User-Agent`, which is what a ticket's header conditions can read.

## The receipt

A successful consumption returns its receipt:

```python
{
    "ticket_id": "unlock-guide",
    "consume_id": "UwdAhf6k3Qp",   # base62 of the time in milliseconds, then 4 random characters
    "user_id": "f2b6c9e1-...",      # the user with auth=True, else "<ip>(<user agent>)"
    "is_test": False,
    "timestamp": 1757721600000,     # milliseconds, read from consume_id
    "hash": "...",
}
```

A ticket with a Respond action returns what that action composed instead, as it was sent. A ticket that limits how many runs go at once, with every slot taken, returns the receipt with `"queued": True` and `"position"` (1 = next); its actions run when its turn comes.

## When a consumption fails

A refused consumption raises a `SkapiError` whose `code` is the ticket's error code and whose `cause` is the whole error body:

```python
try:
    skapi.consume_ticket("launch-coupon", "GET", {"code": "WRONG"})
except SkapiError as err:
    print(err.code)                  # CONDITION_FAILED
    print(err.message)               # one sentence
    print(err.cause["stage"])        # "ticket", "condition" or "action"
    print(err.cause.get("detail"))   # {"field": "params", "keys": ["code"]}
    print(err.cause.get("action"))   # {"act": "req", "path": "actions[2]"} on an action failure
```

This is the same whether the ticket answered 400 or, with **Always answer 200** on, 200. Mistakes caught before sending (a bad `ticket_id`, `auth=True` with GET) are plain `INVALID_PARAMETER` errors with no `cause`.

| code | stage | when |
|---|---|---|
| `INVALID_SERVICE`, `SERVICE_DISABLED` | ticket | the project is not found or is switched off |
| `TICKET_NOT_FOUND`, `TICKET_DISABLED`, `TICKET_EXPIRED`, `TICKET_EXHAUSTED` | ticket | no such ticket, switched off, past its time to live, or no count left |
| `USER_LIMIT_REACHED` | ticket | the per-user limit is used up |
| `ISSUER_CANNOT_CONSUME` | ticket | the caller is the ticket's issuer |
| `AUTH_REQUIRED` | any | the ticket needs a user and the call has none (`auth=True` is missing), or the token is from another project |
| `METHOD_NOT_ALLOWED`, `CONDITION_FAILED` | condition | the request does not match the ticket's condition |
| `PATH_NOT_FOUND`, `PLACEHOLDER_MISSING` | action | an action read a value the request does not carry |
| `REQUEST_FAILED`, `ACTION_FAILED`, `ACTION_FORBIDDEN`, `TIMEOUT`, `QUOTA_EXCEEDED`, `ALREADY_RESPONDED` | action | an action could not be done |
| `INTERNAL_ERROR` | any | an unexpected failure |

There is no rollback: actions that ran before a failure stay done.

## Listing tickets

[get_tickets](/api-reference/tickets#get-tickets) lists the project's tickets for a signed-in user. Each row is the public part of a ticket:

```python
tickets = skapi.get_tickets()
# {"list": [{"ticket_id": "launch-coupon", "description": "Launch coupon", "count": 87, "timestamp": 1757721600000}, ...], ...}

one = skapi.get_tickets({"ticket_id": "launch-coupon"})
```

`count` (consumptions left) and `time_to_live` (when it expires, in milliseconds) are there only when the ticket has them.

## Your own consumptions

[get_consumed_tickets](/api-reference/tickets#get-consumed-tickets) lists the signed-in user's consumptions, oldest first. Only calls made with `auth=True` belong to a user, so anonymous ones never appear. `ticket_id` narrows the list to tickets whose ID starts with it.

```python
import json

consumed = skapi.get_consumed_tickets({"ticket_id": "unlock-guide"})

for row in consumed["list"]:
    log = json.loads(row["description"])
    print(row["ticket_id"], row["consume_id"], row["timestamp"], log["outcome"]["ok"])
```

| field | |
|---|---|
| `ticket_id`, `consume_id`, `timestamp` | as in the receipt |
| `user_id`, `reg` | your user ID |
| `is_test` | always `False` here: only dry runs are `True`, and they are anonymous |
| `description` | the consumption log as JSON text: the request as received (`data`, `method`, `headers`, `ip`, `user_agent`, `timestamp`) and its `outcome` (`ok`, `actions`, `error`, ...) |
| `hash` | proof string of the consumption |

Both listings page like [get_records](/database/fetch#paging).
