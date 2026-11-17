# Signing Up Users

[`signup()`](/api-reference/authentication#signup) creates an account in your project. `email` and `password` are required. The password must be 6 to 60 characters.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

res = skapi.signup({
    "email": "user@example.com",
    "password": "password",
    "name": "Ana",
})
print(res)  # SUCCESS: The account has been created.
```

You can pass any [profile field](/authentication/profile#profile-fields) in the same dict. `signup()` first logs out the user signed in on this `Skapi` object, if any.

A user who never logs in within 7 days of signing up loses the signup and has to sign up again.

## Username

`username` is optional. When given, it becomes the account's permanent login ID and can never be changed. The e-mail logs the account in as well, but only once it is [verified](/authentication/email-verification). Without `username`, the e-mail is the login ID.

```python
skapi.signup({"email": "user@example.com", "password": "password", "username": "ana"})
skapi.login(username="ana", password="password")
```

## Log in right after signup

Pass `{"login": True}` as the second argument. `signup()` then returns the user's profile instead of a message.

```python
user = skapi.signup(
    {"email": "user@example.com", "password": "password"},
    {"login": True},
)
print(user["user_id"])
```

`login` cannot be used together with `signup_confirmation`.

## Signup confirmation

With `signup_confirmation`, the user gets an e-mail with a confirmation link and cannot log in until they open it. This keeps fake accounts out. Once confirmed, the user's e-mail counts as verified.

```python
res = skapi.signup(
    {"email": "user@example.com", "password": "password"},
    {"signup_confirmation": True},
)
print(res)  # SUCCESS: The account has been created. User's signup confirmation is required.
```

Instead of `True` you can pass a full URL such as `"https://your.site/welcome"`. The confirmation link leads there once the signup is confirmed. A relative path raises `INVALID_PARAMETER`.

`email_public: True` at signup needs `signup_confirmation`. The `email_subscription` option subscribes the user to a newsletter once they confirm, and also needs `signup_confirmation`.

To use one of your project's uploaded e-mail templates for this call only, pass its message ID: `{"signup_confirmation": True, "template": {"signup_confirmation": "<message_id>", "welcome": "<message_id>"}}`.

## Resending the confirmation e-mail

A user who has not confirmed yet gets `SIGNUP_CONFIRMATION_NEEDED` from [`login()`](/authentication/login). Call [`resend_signup_confirmation()`](/api-reference/authentication#resend-signup-confirmation) on the same `Skapi` object to send the link again.

```python
try:
    skapi.login("user@example.com", "password")
except SkapiError as err:
    if err.code == "SIGNUP_CONFIRMATION_NEEDED":
        print(skapi.resend_signup_confirmation())
    else:
        raise
```

It also works right after a `signup()` with `signup_confirmation` on the same object. Without either, it raises `INVALID_REQUEST` (`Least one login attempt is required.`).

## Errors

| code | when |
|---|---|
| `EXISTS` | `The account already exists.` |
| `INVALID_PARAMETER` | a missing or invalid field or option; the message names it |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `CODE_DELIVERY_FAILURE` | `Failed to deliver verification code.` |

See [signup](/api-reference/authentication#signup) in the API reference for every option and error.
