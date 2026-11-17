# Two-Step Login (MFA)

Users can protect their account with an authenticator app. Once it is on, logging in takes the password and then a 6 digit code from the app. Someone who learns the password still cannot log in without the phone.

Each user turns it on for their own account. Any app that shows 6 digit codes changing every 30 seconds works. Codes are never sent by SMS.

`setup_mfa()`, `enable_mfa()`, `get_mfa_status()` and `disable_mfa()` need a signed-in user (`INVALID_REQUEST`: `User login is required.`) and refuse [anonymous accounts](/authentication/anonymous).

## Turning it on

### Step 1: show the key

[`setup_mfa()`](/api-reference/authentication#setup-mfa) returns a dict with:

- `uri`: an `otpauth://` link. Show it as a QR code (any QR code library can draw one) for the user to scan.
- `secret`: the same key as text, for users who type it into the app.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

mfa = skapi.setup_mfa()
print(mfa["secret"])  # type this into the authenticator app
```

The app lists the account under your project name and the user's e-mail. Pass `issuer` and `account_name` to show other names: `skapi.setup_mfa(issuer="My App", account_name="ana")`.

### Step 2: confirm a code

The user enters the code the app now shows. [`enable_mfa()`](/api-reference/authentication#enable-mfa) checks it and turns two-step login on.

```python
print(skapi.enable_mfa("123456"))  # SUCCESS: MFA has been enabled.
```

A wrong code raises `INVALID_CODE` and changes nothing, so the user can try the next code. Calling `enable_mfa()` before `setup_mfa()` raises `INVALID_REQUEST` (`Call setup_mfa() first.`).

## Logging in with a code

When two-step login is on, [`login()`](/api-reference/authentication#login) checks the password and raises `MFA_REQUIRED`. The user is not signed in yet. Pass the code to [`verify_mfa()`](/api-reference/authentication#verify-mfa), which finishes the login and returns the profile like `login()` does.

```python
def log_in(email, password):
    try:
        return skapi.login(email, password)
    except SkapiError as err:
        if err.code != "MFA_REQUIRED":
            raise
        code = input("Code from your authenticator app: ")
        return skapi.verify_mfa(code)
```

- **3 minutes.** Call `verify_mfa()` within 3 minutes of `login()`. After that it raises `INVALID_REQUEST` (`The sign-in has expired. Call login() again.`).
- **Same object.** The waiting login is kept in memory on this `Skapi` object only, never in `storage`. A new object or a new run must call `login()` again.
- **Wrong code.** `INVALID_CODE` (`Incorrect authenticator code.`) can be retried with the next code. A code that was already used raises `INVALID_CODE` too: wait for the app to show a new one.
- [`open_id_login()`](/authentication/openid) works the same way. `verify_mfa()` then returns the profile alone, without the `openid` values.

## Checking and turning it off

```python
print(skapi.get_mfa_status())  # {'enabled': True}
print(skapi.disable_mfa())     # SUCCESS: MFA has been disabled.
```

After [`disable_mfa()`](/api-reference/authentication#disable-mfa), the next login takes the password alone.

## Lost phone

[Resetting the password](/authentication/password#forgot-password) does not turn two-step login off, so a user who lost their phone cannot log in on their own. An admin of your project can turn it off for them. The user then logs in with their password and can set it up again.
