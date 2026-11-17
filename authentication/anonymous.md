# Anonymous Login

[`anonymous_login()`](/api-reference/authentication#anonymous-login) signs in with a **temporary account**: no e-mail, no password, created by the one call. Use it when a user needs an account for a short task, such as writing records, without signing up.

The project owner must turn on **Anonymous Login** in the project settings. While it is off, the call raises `INVALID_REQUEST` (`Anonymous login is not enabled for this project.`).

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

user = skapi.anonymous_login()
print(user["anonymous"])     # True
print(user["access_group"])  # 1
```

From then on the object is signed in like any other user, with the limits below.

- If this object already holds an anonymous session, `anonymous_login()` returns that account instead of making a new one.
- If another user is signed in, it raises `INVALID_REQUEST` (`A user is already logged in. Log out first.`).
- An anonymous account counts as a user of your project while it exists. At the plan's user limit, it raises `INVALID_REQUEST` (`User limit exceeded.`).

## How long the account lives

While the `Skapi` object lives, it sends a keep-alive every 10 minutes in a background thread. The account is deleted 30 minutes after the last keep-alive, so it goes away about half an hour after your program stops. Everything it owns, such as its records and files, is deleted with it.

A session restored from `storage` in a later run is not kept alive on its own. Call `anonymous_login()` again: it returns the same account and starts the keep-alive.

If the keep-alive finds the account already deleted, the object is signed out and `skapi.user` becomes `None`.

`logout()` deletes the account at once. So does `signup()`, which logs out first. `login()` and `open_id_login()` replace the session; the anonymous account they leave behind is deleted 30 minutes later.

## What an anonymous account cannot do

A temporary account stays temporary. These methods raise `INVALID_REQUEST` with a message starting with `Anonymous accounts cannot`:

- [`update_profile()`](/authentication/profile)
- [`change_password()`](/authentication/password)
- [`verify_email()`](/authentication/email-verification) and [`last_verified_email()`](/authentication/email-verification#going-back-to-the-last-verified-e-mail)
- [`disable_account()`](/authentication/profile#disabling-an-account)
- [`setup_mfa()`, `enable_mfa()`, `disable_mfa()` and `get_mfa_status()`](/authentication/mfa)

It has no e-mail or password, so it cannot reset a password or be recovered either.

To tell anonymous users apart, check `skapi.user.get("anonymous")`: it is `True` on an anonymous account and absent on any other.

## Checking a restored session

With `storage`, a temporary account comes back on the next run. It may have been deleted in the meantime (30 minutes after the last keep-alive). [`verify_anonymous_session()`](/api-reference/authentication#verify-anonymous-session) asks the server:

```python
skapi = Skapi("<Project ID>", storage="session.json")

if skapi.verify_anonymous_session() is None:
    skapi.anonymous_login()  # the old account is gone: start a new one
```

It returns the profile, or `None` after signing out when the account no longer exists. For a regular account it returns the profile without a request.
