# Newsletters

Your users can subscribe to the project's newsletters, read the ones already sent, and unsubscribe. Sending newsletters and managing newsletter groups is done by the project owner on [skapi.com](https://www.skapi.com).

## Groups

Every call names a newsletter group:

| `group` | |
|---|---|
| `0` or `"public"` | The public newsletter. Anyone can subscribe with an e-mail address. |
| `1` or `"authorized"` | Service Email, for signed-in users. |
| `2` to `99` | Signed-in users whose access group is that number or higher. |
| a group name, such as `"promo"` | A named group the project owner created. Who can subscribe is set by the owner. |

## Subscribing

Signed in, the user's own e-mail is subscribed. It has to be [verified](/authentication/email-verification) first:

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

skapi.subscribe_newsletter({"group": "authorized"})
# 'SUCCESS: User's email has been successfully subscribed to the newsletter.'
```

An unverified e-mail fails with `INVALID_REQUEST` `User's email needs to be verified.` No confirmation mail is sent to a signed-in user.

Signed out, pass the `email` to subscribe. The address gets a confirmation mail first, and the subscription starts when the link in it is opened. Only the public newsletter and named groups open to anyone accept this:

```python
skapi = Skapi("<Project ID>")
skapi.subscribe_newsletter({
    "email": "visitor@example.com",
    "group": "public",
    "redirect": "https://your.domain.com/subscribed",  # optional: where the confirmation link lands
})
# 'SUCCESS: Subscribe confirmation e-mail has been sent.'
```

Anonymous accounts cannot subscribe. Every newsletter carries an unsubscribe link at the bottom.

## Unsubscribing

```python
skapi.unsubscribe_newsletter("authorized")  # one group
skapi.unsubscribe_newsletter(None)          # every group
```

Needs a signed-in user. Returns, for example, `SUCCESS: user@example.com has been unsubscribed from group 01.`

## The user's subscriptions

```python
subs = skapi.get_newsletter_subscription()
# [{"timestamp": ..., "group": 1, "subscribed_email": "user@example.com", "active": True}, ...]

skapi.get_newsletter_subscription({"group": "promo"})  # one group
```

`group` is a number for numeric groups and the name for named groups. `active` is `False` while a subscription is inactive or unconfirmed.

## Reading sent newsletters

[`get_newsletters()`](/api-reference/users#get-newsletters) lists newsletters already sent. Without parameters it lists the public newsletter, newest first. Each row has a `url` to read the newsletter:

```python
for nl in skapi.get_newsletters()["list"]:
    print(nl["subject"], nl["timestamp"], nl["url"])
```

To list another group, or search, pass `searchFor`, `value` and `group`:

```python
import time

skapi.get_newsletters(
    {"searchFor": "timestamp", "value": int(time.time() * 1000), "condition": "<", "group": "promo"},
    {"ascending": False},
)

skapi.get_newsletters({"searchFor": "subject", "value": "Spring menu", "group": 1})  # exact subject
```

Group `0` is open to anyone. Groups `1` to `99` need a signed-in user whose access group is at least that number. Named groups follow the access the owner set.

Each row: `message_id`, `timestamp`, `subject`, `url`, `group`, and `complaint`, `read`, `bounced`, `delivered`, `dry`, which only the project owner sees filled in. The paging options are the same as for [`get_records()`](/database/fetch#paging).
