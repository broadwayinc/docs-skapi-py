# Authentication

Every method raises [`SkapiError`](/introduction/errors) with `.code` and `.message`. Methods that need a signed-in user raise `INVALID_REQUEST` (`User login is required.`) without one, and any method can raise `NETWORK_ERROR` when no answer comes back.

Values that fail a check raise `INVALID_PARAMETER` before anything is sent. The common messages:

| field | message |
|---|---|
| `email` | `"email" is required.` / `"email" should be at least 5 characters.` / `"<value>" is an invalid email.` |
| `password` | `"password" is required.` / `"password" should be at least 6 characters.` / `"password" can be up to 60 characters max.` |
| `phone_number` | `"phone_number" is invalid. The format should be "+00123456789". Type: string.` |
| `birthdate` | `"birthdate" is invalid. The format should be "yyyy-mm-dd". Type: string.` |
| `picture`, `profile`, `website`, redirect URLs | `"<value>" is an invalid url.` (a full URL with scheme and host is required) |
| text fields | `<value> is invalid in "<field>". allowed type or value is: Type<string>.` |

## signup

```python
skapi.signup(params: dict, option: dict | None = None) -> str | dict
```

Creates an account. Logs out the user signed in on this object first.

`params`:

| key | type | |
|---|---|---|
| `email` | str | required |
| `password` | str | required, 6 to 60 characters |
| `username` | str | optional permanent login ID; the e-mail logs in too once verified |
| `name`, `nickname`, `given_name`, `middle_name`, `family_name`, `gender`, `misc` | str | |
| `birthdate` | str | `"yyyy-mm-dd"` |
| `phone_number` | str | `"+"` and digits |
| `address` | str or dict | |
| `picture`, `profile`, `website` | str | full URL |
| `email_public`, `phone_number_public`, `address_public`, `gender_public`, `birthdate_public` | bool | default `False` |

`option`:

| key | type | |
|---|---|---|
| `signup_confirmation` | bool or str | `True` sends a confirmation link the user must open before logging in. A full URL also does, and the link leads there after confirming. Default `False`. |
| `login` | bool | log in right after signup and return the profile. Not with `signup_confirmation`. |
| `email_subscription` | bool, int or str | subscribes the user to a newsletter once they confirm. Needs `signup_confirmation`. |
| `template` | dict | `{"signup_confirmation": "<message_id>", "welcome": "<message_id>"}`: uploaded templates for this call |

Returns `"SUCCESS: The account has been created."`, `"SUCCESS: The account has been created. User's signup confirmation is required."` with `signup_confirmation`, or the [profile](/authentication/profile#profile-fields) with `login`.

### Errors

| code | message |
|---|---|
| `EXISTS` | `The account already exists.` |
| `INVALID_PARAMETER` | `Key "email" is required.` / `Key "password" is required.` |
| `INVALID_PARAMETER` | `"address" should be type: <string \| dict>.` |
| `INVALID_PARAMETER` | `Invalid password. Password must be at least 6 characters.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" should be type: <string \| boolean>.` |
| `INVALID_PARAMETER` | `"login" is not allowed when "option.signup_confirmation" is true.` / `"option.login" should be type: boolean.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" should be true if "email_public" is set to true.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" is required for email subscription.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" is required when "option.template.signup_confirmation" is set.` |
| `INVALID_PARAMETER` | `"option.template" should be type: <object>.` / `"option.template.<key>" should be a non-empty <string> (template message_id).` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `CODE_DELIVERY_FAILURE` | `Failed to deliver verification code.` |
| `INVALID_REQUEST` | `Signup validation failed.` or the server's reason |

## resend_signup_confirmation

```python
skapi.resend_signup_confirmation() -> str
```

Sends the signup confirmation e-mail again. Works after `login()` raised `SIGNUP_CONFIRMATION_NEEDED`, or after `signup()` with `signup_confirmation`, on the same object. Returns `"SUCCESS: Signup confirmation e-mail has been sent."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Least one login attempt is required.` |

## login

```python
skapi.login(email: str | None = None, password: str | None = None, *, username: str | None = None) -> dict
```

Signs in and returns the [profile](/authentication/profile#profile-fields). The e-mail is matched without regard to case. A first argument that is not an e-mail address is read as a username. The password is never sent: sign-in proves it with a secure exchange. The session is saved to `storage`.

### Errors

| code | message |
|---|---|
| `INCORRECT_USERNAME_OR_PASSWORD` | `Incorrect username or password.` |
| `SIGNUP_CONFIRMATION_NEEDED` | `User's signup confirmation is required.` |
| `USER_IS_DISABLED` | `This account is disabled.` |
| `MFA_REQUIRED` | `A code from the authenticator app is required to sign in. Call verify_mfa() with the code.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `INVALID_PARAMETER` | `Key "password" is required.` / `"password" should be type: string.` |
| `INVALID_PARAMETER` | `At least one of "username" or "email" is required.` |
| `INVALID_REQUEST` | `Sign-in codes by SMS are not supported.` / `The account must set up an authenticator app before signing in.` |

## verify_mfa

```python
skapi.verify_mfa(code: str) -> dict
```

Finishes a `login()` or `open_id_login()` that raised `MFA_REQUIRED`, with the 6 digit code from the authenticator app (spaces are ignored). Call it on the same object within 3 minutes. Returns the profile. See [Two-Step Login](/authentication/mfa).

| code | message |
|---|---|
| `INVALID_CODE` | `Incorrect authenticator code.` / `This authenticator code was already used. Wait for the next code.` (retry with the next code) |
| `INVALID_REQUEST` | `No sign-in is waiting for an authenticator code. Call login() first.` |
| `INVALID_REQUEST` | `The sign-in has expired. Call login() again.` |
| `INVALID_PARAMETER` | `"code" should be the 6 digit code from the authenticator app.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |

## logout

```python
skapi.logout(global_logout: bool = False) -> str
```

Signs out and removes the session from `storage`. `global_logout=True` also ends every session of the account on every device. On an anonymous account it deletes the account. Returns `"SUCCESS: The user has been logged out."`

## get_profile

```python
skapi.get_profile(refresh_token: bool = False) -> dict | None
```

The signed-in user's profile, or `None`. `refresh_token=True` gets fresh tokens from the server first and returns `None` if that fails.

## user

```python
skapi.user -> dict | None
```

The signed-in user's profile (a copy), or `None`. The first read restores a session saved in `storage`. `skapi.session` holds the tokens: `.id_token.jwt_token`, `.access_token.jwt_token`, `.refresh_token`.

## login_with_token

```python
skapi.login_with_token(id_token: str, access_token: str, refresh_token: str) -> dict
```

Takes over the tokens of a sign-in made elsewhere and returns the profile read from the ID token. All three tokens are required; the object is then signed in as that user and the tokens are saved to `storage`. The token's signature is not checked locally; the server checks it on each request.

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"id_token" is required.` / `"access_token" is required.` / `"refresh_token" is required.` |
| `INVALID_REQUEST` | `Token does not belong to this service.` / `Token has expired.` |

## update_profile

```python
skapi.update_profile(params: dict) -> dict
```

Changes the signed-in user's own profile and returns the updated profile. Takes the same profile keys as [signup](#signup) except `password` and `username`. `''` clears a field (not `email`). The `*_public` flags must be `bool`. Other keys are ignored; with nothing to change, it returns the profile without a request. A changed `email` becomes unverified.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous accounts cannot edit their profile.` |
| `INVALID_REQUEST` | `User's e-mail should be verified to set "email_public" to true.` |
| `INVALID_PARAMETER` | `<value> is invalid in "<flag>". allowed type or value is: Type<boolean>.` |
| the server's code | the server's message, when it refuses the change |

## change_password

```python
skapi.change_password(current_password: str, new_password: str) -> str
```

Returns `"SUCCESS: Password has been changed."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Incorrect password.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot change their password.` |
| `INVALID_PARAMETER` | `"current_password" is required to change password.` / `"new_password" is required to change password.` |
| `INVALID_PARAMETER` | `"new_password" should be at least 6 characters.` / `"new_password" can be up to 60 characters max.` (the same for `current_password`) |
| `INVALID_PARAMETER` | `Invalid password parameter.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |

## forgot_password

```python
skapi.forgot_password(email: str, template: dict | None = None) -> str
```

E-mails a password reset code. `template={"forgot_password": "<message_id>"}` uses an uploaded template for this call. Returns `"SUCCESS: Verification code has been sent."`

| code | message |
|---|---|
| `NOT_EXISTS` | the server's message |
| `INVALID_REQUEST` | the server's message, for example `User password cannot be reset in the current state.` |
| `REQUEST_EXCEED` | the server's message, for example `Attempt limit exceeded, please try after some time.` |
| `CODE_DELIVERY_FAILURE` | the server's message |
| `INVALID_PARAMETER` | `"template.forgot_password" should be a non-empty <string> (template message_id).` |

## reset_password

```python
skapi.reset_password(email: str, code: str | int, new_password: str) -> str
```

Sets a new password with the code from `forgot_password()`. Returns `"SUCCESS: New password has been set."` A wrong or expired code raises the server's code and message, for example `CodeMismatchException`.

| code | message |
|---|---|
| `INVALID_PARAMETER` | `<value> is invalid in "code". allowed types or values are: Type<number>, Type<string>.` |

## verify_email

```python
skapi.verify_email(code: str | None = None, template: dict | None = None) -> str
```

Without `code`, e-mails a verification code and returns `"SUCCESS: Verification code has been sent."` With `code`, verifies the e-mail and returns `'SUCCESS: "email" is verified.'`, which is also returned at once when the e-mail is already verified. `template={"verification": "<message_id>"}` uses an uploaded template for the code e-mail.

| code | message |
|---|---|
| `INVALID_REQUEST` | `The user has to be logged in.` / `No e-mail to verify` |
| `INVALID_REQUEST` | `Anonymous accounts cannot verify an e-mail.` |
| `INVALID_PARAMETER` | `<value> is invalid in "code". allowed type or value is: Type<string>.` |
| `CodeMismatchException` | `Invalid verification code provided, please try again.` |
| `LimitExceededException` | `Attempt limit exceeded, please try after some time.` |

## last_verified_email

```python
skapi.last_verified_email(revert: bool | None = None) -> str | dict
```

Returns the user's last verified e-mail (the current one, if it is verified). `revert=True` switches the account back to that e-mail, verified, and returns the updated profile.

| code | message |
|---|---|
| `NOT_EXISTS` | `User does not have a verified e-mail.` |
| `EXISTS` | `E-mail "<email>" is already a login ID in this project.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot change their e-mail.` |

## disable_account

```python
skapi.disable_account() -> str
```

Disables the signed-in user's account and logs out. The account's data is deleted after 90 days unless it is recovered. Returns `"SUCCESS: account has been disabled."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous accounts cannot be disabled.` |

## recover_account

```python
skapi.recover_account(redirect: bool | str = False) -> str
```

After `login()` raised `USER_IS_DISABLED` on this object, e-mails a recovery link to the account. A full URL in `redirect` is where the link leads after the recovery. Returns `"SUCCESS: Recovery e-mail has been sent."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Least one signin attempt of disabled account is required.` |
| `INVALID_REQUEST` | `Argument should be type: <boolean \| string>.` |

## open_id_login

```python
skapi.open_id_login(token: str, id: str, merge: bool | str | list[str] | None = None, template: dict | None = None) -> dict
```

Signs in through the OpenID logger `id` with a token from the provider, creating the account on first use. `merge=True` merges into an existing account with the same login ID; a list of attribute names also copies those OpenID attributes. `template={"welcome": "<message_id>"}` uses an uploaded template for the welcome e-mail.

Returns `{"userProfile": dict, "openid": dict}`. Can raise `MFA_REQUIRED`, `USER_IS_DISABLED` and `REQUEST_EXCEED` like [login](#login).

| code | message |
|---|---|
| `ACCOUNT_EXISTS` | `The account already exists.` (retry with `merge`) |
| `INVALID_REQUEST` | `The account needs to be confirmed.` |
| `EXISTS` | `The login ID of this OpenID account is already used by another account.` |
| `INVALID_PARAMETER` | `"merge" should be type: <boolean \| string[]>.` / `"merge" array items should be type: <string>.` |
| `INVALID_PARAMETER` | `"template.welcome" should be a non-empty <string> (template message_id).` |

## anonymous_login

```python
skapi.anonymous_login() -> dict
```

Signs in with a temporary account (`anonymous: True`, access group `1`) and returns its profile. Returns the current account when this object already holds an anonymous session. Sends a keep-alive every 10 minutes while the object lives; the account is deleted 30 minutes after the last one, or at once on `logout()`. See [Anonymous Login](/authentication/anonymous).

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous login is not enabled for this project.` |
| `INVALID_REQUEST` | `User limit exceeded.` |
| `INVALID_REQUEST` | `A user is already logged in. Log out first.` |

## verify_anonymous_session

```python
skapi.verify_anonymous_session() -> dict | None
```

For a temporary account restored from `storage`: asks the server whether it still exists. Returns the profile, or `None` (after signing out) when the account was deleted. Any other signed-in user is returned as is, without a request; signed out returns `None`.

## setup_mfa

```python
skapi.setup_mfa(issuer: str | None = None, account_name: str | None = None) -> dict
```

Starts two-step login setup. Returns `{"secret": str, "uri": str}`: show `uri` (`otpauth://...`) as a QR code, or `secret` for typing in. `issuer` defaults to the project name, `account_name` to the user's e-mail. Follow with [enable_mfa](#enable-mfa).

## enable_mfa

```python
skapi.enable_mfa(code: str) -> str
```

Checks a code from the app and turns two-step login on. Returns `"SUCCESS: MFA has been enabled."`

| code | message |
|---|---|
| `INVALID_CODE` | `Incorrect authenticator code.` (nothing changed) |
| `INVALID_REQUEST` | `Call setup_mfa() first.` |
| `INVALID_PARAMETER` | `"code" should be the 6 digit code from the authenticator app.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |

## disable_mfa

```python
skapi.disable_mfa() -> str
```

Turns two-step login off. Returns `"SUCCESS: MFA has been disabled."`

## get_mfa_status

```python
skapi.get_mfa_status() -> dict
```

Returns `{"enabled": bool}`.

`setup_mfa()`, `enable_mfa()`, `disable_mfa()` and `get_mfa_status()` need a signed-in user and raise `INVALID_REQUEST` with a message starting with `Anonymous accounts cannot` on an anonymous account.
