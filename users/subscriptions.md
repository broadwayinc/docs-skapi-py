# Subscriptions and Feed

Users can subscribe to other users. A subscriber can read the records a user posts for subscribers, and get the ones posted to the feed in one list with [`get_feed()`](/api-reference/users#get-feed). Every method on this page needs a signed-in user.

## Subscribing

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")
skapi.login("b@example.com", "password")

sub = skapi.subscribe({"user_id": "<user A id>", "get_feed": True})
print(sub)  # {"subscriber": "<user B id>", "subscription": "<user A id>", "timestamp": ..., "blocked": False, "get_feed": True, ...}
```

| option | |
|---|---|
| `get_feed` | `True` puts the user's feed records in your [`get_feed()`](#the-feed). Needed for the feed. |
| `get_notified` | Push notifications for the user's new records. The device registers for them in the browser with skapi-js. |
| `get_email` | A preference saved with the subscription. `True` needs a verified e-mail, otherwise `User has no verified email address.` |

A new subscription starts with every option off. Calling `subscribe()` again for the same user changes only the options you pass and keeps the others.

You cannot subscribe to yourself. If the user blocked you, the call fails with `The subscription is blocked.`

```python
skapi.unsubscribe({"user_id": "<user A id>"})  # 'SUCCESS: The user has unsubscribed.'
```

## Blocking subscribers

A user can stop another user from reading their subscription records:

```python
skapi.block_subscriber({"user_id": "<user B id>"})    # 'SUCCESS: Blocked user ID "<user B id>".'
skapi.unblock_subscriber({"user_id": "<user B id>"})  # 'SUCCESS: Unblocked user ID "<user B id>".'
```

A user can be blocked before they ever subscribe. An unblocked subscriber gets their subscription back with the options they had; unblocking someone who never subscribed does not subscribe them. Blocking guards the subscription records only: files on those records are still reachable by their link unless the record is private or in a higher access group.

## Listing subscriptions

Pass `subscriber`, `subscription`, or both (user IDs):

```python
# who user B subscribes to
skapi.get_subscriptions({"subscriber": "<user B id>"})

# who subscribes to user A
skapi.get_subscriptions({"subscription": "<user A id>"})

# is user B subscribed to user A? (one row, or an empty list)
skapi.get_subscriptions({"subscriber": "<user B id>", "subscription": "<user A id>"})

# the users who blocked user B
skapi.get_subscriptions({"subscriber": "<user B id>", "blocked": True})
```

Each row is `{"subscriber", "subscription", "timestamp", "blocked"}`. With `subscriber=` alone, `blocked=True` lists only the blocked rows and anything else lists only the active ones. With `subscription=` alone, every subscriber comes back, blocked ones included, each with its `blocked` flag; `blocked=True` lists only the blocked ones.

Your own user ID as `subscription` lists your own subscribers:

```python
me = skapi.user["user_id"]
my_subscribers = skapi.get_subscriptions({"subscription": me})
blocked_by_me = skapi.get_subscriptions({"subscription": me, "blocked": True})
```

Your subscriber count is `subscribers` in your [`get_users()`](/users/search) result.

The paging options are the same as for [`get_records()`](/database/fetch#paging).

## Posting to subscribers

A record is for subscribers when it is posted with `table.subscription` in [`post_record()`](/database/create):

```python
skapi.post_record({"title": "New post"}, {
    "table": {
        "name": "Posts",
        "access_group": "authorized",
        "subscription": {
            "is_subscription_record": True,  # only subscribers can read it
            "upload_to_feed": True,          # and it appears in their feed
        },
    },
})
```

- `is_subscription_record`: only the uploader's subscribers (not blocked) can read the record.
- `upload_to_feed`: the record goes to the feed of subscribers who set `get_feed`. Off unless set.

Both are independent. Signed-out users cannot post subscription records.

Subscribers read the subscription records of one user with `table.subscription` in [`get_records()`](/database/fetch):

```python
skapi.get_records({"table": {"name": "Posts", "access_group": "authorized", "subscription": "<user A id>"}})
```

## The feed

[`get_feed()`](/api-reference/users#get-feed) lists the feed records of every user you subscribe to with `get_feed`, newest first:

```python
feed = skapi.get_feed({"access_group": "authorized"})
for record in feed["list"]:
    print(record["user_id"], record["data"])
```

`access_group` picks which records: `"public"` (0), `"authorized"` (1, the default) or a higher number up to your own access group. Each row is a record, as [`get_records()`](/database/fetch#the-record) returns it.

- A new record can take a few seconds to show in the feed.
- Records posted before you subscribed do not appear.
- After you unsubscribe, that user's records leave your feed, past ones included.
