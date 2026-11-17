# Groups and Messages

## Sending to a user

Pass a user ID as the recipient. The user receives a `"private"` event on any connection they have open, whatever group they are in:

```python
skapi.post_realtime({"text": "Hi!"}, "<user id>")
```

The message is any JSON value. With its headers it can be at most 32 KB (32768 bytes); a bigger one raises `INVALID_PARAMETER` without sending.

## Joining a group

```python
skapi.join_realtime("lobby")
```

```python
{"type": "success", "message": 'Joined realtime message group: "lobby".'}
```

A connection is in one group at a time: joining another group leaves the current one. The members get a `"notice"` with `USER_JOINED` when you join and `USER_LEFT` when you leave.

```python
skapi.join_realtime(None)   # leaves the group
```

## Sending to the group

Pass the group's name as the recipient. Every member, you included, receives a `"message"` event:

```python
skapi.post_realtime({"text": "Hello everyone"}, "lobby")
```

You can only post to the group you joined; any other group name raises `INVALID_REQUEST`: `User has not joined to the recipient group. Run join_realtime("<group>")`.

The first post right after joining waits, at most 3 seconds, until the server confirms the join, so the group does not miss it.

### Message order

Messages one sender posts to a group arrive in the order they were sent. Posts made less than 100 milliseconds apart are sent together in one frame and still arrive one by one, in order. A post 100 milliseconds or more after the one before goes at once.

### Notifications

A message can carry a push notification for recipients who use the project in a web browser:

```python
skapi.post_realtime(
    {"text": "Dinner is ready"},
    "<user id>",
    {"title": "New message", "body": "Dinner is ready", "config": {"always": True}},
)
```

`title` and `body` are required strings, together at most 3 KB. By default the notification is sent only to recipients who are not connected; `"always": True` sends it to everyone. A message with a notification is never sent together with other posts.

## Listing groups

[get_realtime_groups](/api-reference/realtime#get-realtime-groups) lists the groups that have members right now:

```python
skapi.get_realtime_groups()
# {"list": [{"group": "lobby", "number_of_users": 3}, ...], "startKey": ..., "endOfList": True}

skapi.get_realtime_groups({"searchFor": "group", "value": "lob", "condition": ">="})
skapi.get_realtime_groups({"searchFor": "number_of_users", "value": 10, "condition": ">="})
```

## Listing users in a group

[get_realtime_users](/api-reference/realtime#get-realtime-users) lists the connections in a group, by default the one you joined:

```python
skapi.get_realtime_users()
# {"list": [{"user_id": "...", "cid": "cid:..."}, ...], ...}

skapi.get_realtime_users({"group": "lobby", "user_id": "<user id>"})   # one user's connections there
```

A user with two devices connected appears twice, with two `cid`s.
