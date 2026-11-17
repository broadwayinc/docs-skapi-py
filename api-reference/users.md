# Users

## get_users

```python
skapi.get_users(params: dict | None = None, fetch_options: dict | None = None) -> dict
```

Signed-in users only. Returns `{"list": [UserPublic, ...], "startKey": ..., "endOfList": bool, "startKeyHistory": [...]}`.

| key | type | |
|---|---|---|
| `searchFor` | str | required: `user_id`, `name`, `email`, `phone_number`, `address`, `gender`, `birthdate`, `locale`, `subscribers`, `timestamp`, `access_group`, `approved` |
| `value` | str, number, or a list of them | required; type must match the field |
| `condition` | str | `"="` (default), `">"`, `">="`, `"<"`, `"<="`, `"gt"`, `"gte"`, `"eq"`, `"lt"`, `"lte"`; anything else is read as `"="` |
| `range` | same type as `value` | searches from `value` to `range` |

Without `params`: every user, newest sign-up first.

`fetch_options`: `limit` (up to 1000), `fetchMore`, `ascending`, `startKey`. See [Fetching Records](/database/fetch#paging).

**UserPublic** keys: `user_id`, `access_group`, `locale`, `approved`, `timestamp` (sign-up, ms), `log` (last login, ms), `subscribers`, `subscribed`, `records`, and each profile field the user made public (`email`, `name`, `address`, `gender`, `birthdate`, `phone_number`, ...). `anonymous: True` on temporary accounts.

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `Key "searchFor" is required.` / `Key "value" is required.` |
| `INVALID_PARAMETER` | `Value does not match the type of "<field>" index.` |
| `INVALID_PARAMETER` | `Conditions does not apply on range search.` |
| `INVALID_PARAMETER` | `Conditions are not allowed on a list of "<field>" values. Search for a single value to use a condition or range.` |
| `INVALID_PARAMETER` | `Value should not be an empty string.` |

## subscribe

```python
skapi.subscribe(params: dict) -> dict
```

Signed-in users only. Subscribes to another user. See [Subscriptions and Feed](/users/subscriptions).

| key | type | |
|---|---|---|
| `user_id` | str | required; the user to subscribe to, not yourself |
| `get_feed` | bool | `True`: the user's feed records appear in [`get_feed()`](#get-feed) |
| `get_notified` | bool | push notifications for the user's new records |
| `get_email` | bool | saved with the subscription; `True` needs a verified e-mail |

A new subscription starts with every option off; calling again changes only the options given.

Returns **Subscription**: `{"subscriber", "subscription", "timestamp", "blocked", "get_feed", "get_notified", "get_email"}`.

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `Key "user_id" is required.` |
| `INVALID_PARAMETER` | `"user_id" cannot be the user's own ID.` / `"user_id" is empty.` / `"user_id" should be type: string.` / `"user_id" is invalid.` |
| `INVALID_PARAMETER` | `<value> is invalid in "get_feed". allowed type or value is: Type<boolean>.` (same for `get_notified`) |
| `INVALID_PARAMETER` | `User has no verified email address.` |
| `NOT_EXISTS` | `The user does not exists.` |
| `INVALID_REQUEST` | `The subscription is blocked.` |

## unsubscribe

```python
skapi.unsubscribe(params: dict) -> str
```

Signed-in users only. `params`: `{"user_id": str}`. Returns `SUCCESS: The user has unsubscribed.`, also when there was no subscription.

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `Key "user_id" is required.` |
| `INVALID_PARAMETER` | `"user_id" cannot be the user's own ID.` / `"user_id" is empty.` / `"user_id" should be type: string.` / `"user_id" is invalid.` |
| `NOT_EXISTS` | `The user does not exists.` |
| `INVALID_REQUEST` | `The account is blocked from subscription group: 01.` |

## block_subscriber

```python
skapi.block_subscriber(params: dict) -> str
```

Signed-in users only. `params`: `{"user_id": str}`. Stops that user from reading your subscription records and getting your feed records. Works on users who never subscribed. Returns `SUCCESS: Blocked user ID "<user_id>".`

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `Key "user_id" is required.` |
| `INVALID_PARAMETER` | `"user_id" cannot be the user's own ID.` / `"user_id" is empty.` / `"user_id" should be type: string.` / `"user_id" is invalid.` |
| `INVALID_REQUEST` | `Cannot block/unblock service owner.` |

## unblock_subscriber

```python
skapi.unblock_subscriber(params: dict) -> str
```

Signed-in users only. `params`: `{"user_id": str}`. A blocked subscriber gets their subscription back with the options they had. Returns `SUCCESS: Unblocked user ID "<user_id>".`

### Errors

Same as [block_subscriber](#block-subscriber).

## get_subscriptions

```python
skapi.get_subscriptions(params: dict, fetch_options: dict | None = None) -> dict
```

Signed-in users only. Returns `{"list": [Subscription, ...], "startKey", "endOfList", "startKeyHistory"}`; each row is `{"subscriber", "subscription", "timestamp", "blocked"}`.

| key | type | |
|---|---|---|
| `subscriber` | str | user ID of the subscriber: lists who they subscribe to |
| `subscription` | str | user ID of the user subscribed to: lists their subscribers, blocked ones included. Your own ID lists your own subscribers. |
| `blocked` | bool | `True` lists only blocked rows. With `subscriber` alone, anything else lists only active ones. |

At least one of `subscriber` or `subscription` is required. Both: that one subscription, or an empty list.

`fetch_options`: `limit`, `fetchMore`, `ascending` (default `True`), `startKey`. See [Fetching Records](/database/fetch#paging).

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `User ID in "subscriber" is empty.` / `User ID in "subscriber" should be type: string.` / `User ID in "subscriber" is invalid.` |
| `INVALID_PARAMETER` | `User ID in "subscription" is empty.` / `User ID in "subscription" should be type: string.` / `User ID in "subscription" is invalid.` |
| `INVALID_PARAMETER` | `<value> is invalid in "blocked". allowed type or value is: Type<boolean>.` |
| `INVALID_PARAMETER` | `At least either "subscriber" or "subscription" should have a value.` |

## get_feed

```python
skapi.get_feed(params: dict | None = None, fetch_options: dict | None = None) -> dict
```

Signed-in users only. Records posted with `upload_to_feed` by the users you subscribe to with `get_feed`, newest first. Returns `{"list": [record, ...], "startKey", "endOfList", "startKeyHistory"}`; each record as in [Fetching Records](/database/fetch#the-record). A new record can take a few seconds to appear.

| key | type | |
|---|---|---|
| `access_group` | int, `"public"` or `"authorized"` | which records: `0` to your own access group. Default `1` (`"authorized"`). |

`fetch_options`: `limit` (default 100), `fetchMore`, `ascending` (default `False`), `startKey`.

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `"access_group" should be type number.` |
| `INVALID_PARAMETER` | `"access_group" should be zero or a positive number.` |
| `INVALID_PARAMETER` | `User has no access.` |

## subscribe_newsletter

```python
skapi.subscribe_newsletter(params: dict) -> str
```

Subscribes an e-mail to one newsletter group. See [Newsletters](/users/newsletters).

| key | type | |
|---|---|---|
| `group` | int, str | required: `0` or `"public"`, `1` or `"authorized"`, `2` to `99`, or a group name |
| `email` | str | required when signed out; ignored when signed in (the account's verified e-mail is used) |
| `redirect` | str | signed out: the URL the confirmation link lands on |

Returns:

- signed in: `SUCCESS: User's email has been successfully subscribed to the newsletter.`
- signed out: `SUCCESS: Subscribe confirmation e-mail has been sent.` (or `SUCCESS: User's e-mail has been successfully subscribed to the newsletter.` when already subscribed)

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous accounts cannot subscribe to newsletters.` |
| `INVALID_PARAMETER` | `Key "group" is required.` / `Key "email" is required.` |
| `INVALID_PARAMETER` | `"group" should be an integer between 0 and 99.` |
| `INVALID_PARAMETER` | `Newsletter group name must be 2-20 lowercase alphanumeric characters, contain a letter, and not be a reserved name.` |
| `INVALID_PARAMETER` | `"email" should be at least 5 characters.` / `"<email>" is an invalid email.` |
| `INVALID_PARAMETER` | `"<url>" is an invalid url.` |
| `INVALID_REQUEST` | `User's email needs to be verified.` |
| `INVALID_REQUEST` | `No access.` / `Access denied. Your access group is insufficient to subscribe to group "<name>".` |
| `INVALID_REQUEST` | `Only authenticated users have access to "group".` (signed out, group 1 to 99) |
| `INVALID_REQUEST` | `Group "<name>" does not exist for service "<project id>".` |
| `INVALID_REQUEST` | `Newsletter subscriber limit reached. Consider upgrading your plan.` |

## unsubscribe_newsletter

```python
skapi.unsubscribe_newsletter(group: int | str | None) -> str
```

Signed-in users only. `group` as in [subscribe_newsletter](#subscribe-newsletter); `None` unsubscribes from every group. Returns `SUCCESS: <email> has been unsubscribed from group <group>.` (numeric groups as two digits, such as `01`) or `SUCCESS: <email> has been unsubscribed from all groups.`

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot subscribe to newsletters.` |
| `INVALID_PARAMETER` | `"group" should be an integer between 0 and 99.` / `Newsletter group name must be 2-20 lowercase alphanumeric characters, contain a letter, and not be a reserved name.` |

## get_newsletters

```python
skapi.get_newsletters(params: dict | None = None, fetch_options: dict | None = None) -> dict
```

Newsletters sent to a group. Without `params`: the public newsletter (group `0`), newest first. Returns `{"list": [Newsletter, ...], "startKey", "endOfList", "startKeyHistory"}`.

| key | type | |
|---|---|---|
| `searchFor` | str | required: `message_id`, `timestamp`, `subject`, `complaint`, `read`, `bounced` |
| `value` | str for `message_id` and `subject`, number otherwise | required |
| `group` | int, str | required; as in [subscribe_newsletter](#subscribe-newsletter) |
| `condition` | str | `"="` (default), `">"`, `">="`, `"<"`, `"<="`, `"gt"`, `"gte"`, `"eq"`, `"lt"`, `"lte"`; anything else is read as `"="` |
| `range` | same type as `value` | searches from `value` to `range` |

Group `0` and named groups open to anyone can be read signed out. Groups `1` to `99` need a signed-in user whose access group is at least the group.

`fetch_options`: `limit` (default 50), `fetchMore`, `ascending`, `startKey`.

**Newsletter** keys: `message_id`, `timestamp`, `subject`, `url` (the newsletter to read), `group`, and `complaint`, `read`, `bounced`, `delivered`, `dry` (filled in for the project owner only; `0`, `""` or `False` for users).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "searchFor" is required.` / `Key "value" is required.` / `Key "group" is required.` |
| `INVALID_PARAMETER` | `"<value>" is invalid in "searchFor". allowed types or values are: "message_id", "timestamp", "subject", "complaint", "read", "bounced".` |
| `INVALID_PARAMETER` | `"value" type does not match the type of "<searchFor>" index.` / `"value" should not be empty string.` |
| `INVALID_PARAMETER` | `"range" should match type of "value".` |
| `INVALID_PARAMETER` | `User should be logged in.` / `User has no access.` |
| `INVALID_REQUEST` | `No access.` / `Access denied. Your access group is insufficient to subscribe to group "<name>".` |

## get_newsletter_subscription

```python
skapi.get_newsletter_subscription(params: dict | None = None, fetch_options: dict | None = None) -> list
```

Signed-in users only. The user's own newsletter subscriptions, all at once (no paging). `params`: `{"group": ...}` to list one group (as in [subscribe_newsletter](#subscribe-newsletter)); left out or `None`: every group.

Returns `[{"timestamp", "group", "subscribed_email", "active"}, ...]`. `group` is an int for numeric groups and the name for named groups; `active` is `False` while the subscription is inactive or unconfirmed.

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot subscribe to newsletters.` |
| `INVALID_PARAMETER` | `"group" should be an integer between 0 and 99.` / `Newsletter group name must be 2-20 lowercase alphanumeric characters, contain a letter, and not be a reserved name.` |

## send_inquiry

```python
skapi.send_inquiry(data: dict) -> str
```

Sends a message to the project owner's e-mail. No sign-in needed. See [Inquiries](/users/inquiry).

| key | type | |
|---|---|---|
| `name` | str | required |
| `email` | str | required; a valid e-mail address |
| `subject` | str | required |
| `message` | str | required |

Returns `SUCCESS: Inquiry has been sent.`

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "name" is required.` (same for `email`, `subject`, `message`) |
| `INVALID_PARAMETER` | `<value> is invalid in "name". allowed type or value is: Type<string>.` (same for `subject`, `message`) |
| `INVALID_PARAMETER` | `"email" should be type: string.` / `"email" should be at least 5 characters.` / `"<email>" is an invalid email.` |
| `ERROR` | `Project does not allow inquiry.` |
