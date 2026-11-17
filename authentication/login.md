# Login / Logout

## Login

[`login()`](/api-reference/authentication#login) signs a user in with their e-mail and password and returns their [profile](/authentication/profile#profile-fields) as a dict.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

user = skapi.login("user@example.com", "password")
print(user["email"])
```

The password is never sent. Sign-in proves it with a secure exchange, so only the proof travels over the network.

The e-mail is matched without regard to letter case. An account created with a `username` logs in with it: `login(username="ana", password="password")`. A first argument that is not an e-mail address is also read as a username.

### Handling login errors

```python
try:
    user = skapi.login("user@example.com", "password")
except SkapiError as err:
    if err.code == "INCORRECT_USERNAME_OR_PASSWORD":
        print("Wrong e-mail or password.")
    elif err.code == "SIGNUP_CONFIRMATION_NEEDED":
        skapi.resend_signup_confirmation()   # see Signing Up Users
    elif err.code == "USER_IS_DISABLED":
        skapi.recover_account()              # see User Profile
    elif err.code == "MFA_REQUIRED":
        user = skapi.verify_mfa(input("Code from your authenticator app: "))
    else:
        raise
```

- `SIGNUP_CONFIRMATION_NEEDED`: the user has not opened the [confirmation link](/authentication/signup#signup-confirmation) yet.
- `USER_IS_DISABLED`: the user disabled their account. See [recovering it](/authentication/profile#recovering-a-disabled-account).
- `MFA_REQUIRED`: the password was right and the account has [two-step login](/authentication/mfa) on.
- `REQUEST_EXCEED`: too many attempts. Wait and try again.

## The signed-in user

`skapi.user` is the signed-in user's profile, or `None` when nobody is signed in. It is a copy: changing it changes nothing on the server.

```python
if skapi.user is None:
    skapi.login("user@example.com", "password")
print(skapi.user["user_id"])
```

[`get_profile()`](/api-reference/authentication#get-profile) returns the same thing. `get_profile(refresh_token=True)` asks the server for fresh tokens first, so the profile shows changes made elsewhere, for example on another device or by an admin. It returns `None` if the refresh fails. When the saved tokens had already expired and were just refreshed while the session was restored, that refresh is used: the server is asked once, not twice.

skapi-py refreshes the tokens on its own before a request when they have less than an hour left. One refresh runs at a time: other threads using the same object (its realtime and keep-alive threads too) wait for it and use the new tokens. If the network is down, the session stays and the request raises `NETWORK_ERROR`. The session ends only on logout, or when the server refuses the refresh (for example after a global logout).

## Staying signed in between runs

By default the session lives only as long as the `Skapi` object. Pass a file path as `storage` to keep it between runs:

```python
skapi = Skapi("<Project ID>", storage="~/.myapp/session.json")

if skapi.user is None:          # signed in from the file when it holds a session
    skapi.login("user@example.com", "password")
```

The file holds the user's tokens and is created readable by you only. Keep it out of version control. If the saved tokens have expired and the network is down when they are read, the object stays signed in with them: signed-in calls raise `NETWORK_ERROR`, and the first one after the network is back refreshes the tokens. `storage` can also be any object with `get_item(key)`, `set_item(key, value)` and `remove_item(key)`, for example to keep sessions in your own database. Logging out removes the tokens from storage.

## Logout

```python
print(skapi.logout())  # SUCCESS: The user has been logged out.
```

`logout(global_logout=True)` also ends every session of the account on every device.

A logout wins over a token refresh another thread is still running: the refresh does not sign the user back in, its tokens are removed from storage, and the call that waited for it raises `User login is required.`

On an [anonymous](/authentication/anonymous) session, `logout()` deletes the temporary account.

## Signing in with tokens

[`login_with_token()`](/api-reference/authentication#login-with-token) takes over a session that started somewhere else, for example a web app using skapi-js that sends the user's tokens to your Python server.

```python
user = skapi.login_with_token(id_token, access_token, refresh_token)
```

All three tokens are required. The ID token must belong to this project and must not be expired. The object is then signed in as that user, and the tokens are saved to `storage`. `skapi.session` holds the current tokens (`.id_token.jwt_token`, `.access_token.jwt_token`, `.refresh_token`) if you need to pass them on.

::: warning
skapi-py reads the profile from the ID token without checking its signature. The server checks the tokens on every request. Before trusting `skapi.user` in your own server code, make a signed-in call, for example `get_profile(refresh_token=True)`, which returns `None` for tokens the server refuses.
:::
