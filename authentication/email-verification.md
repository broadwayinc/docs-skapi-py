# E-Mail Verification

A verified e-mail lets the user:

- reset a [forgotten password](/authentication/password#forgot-password),
- [recover](/authentication/profile#recovering-a-disabled-account) a disabled account,
- make their e-mail [public](/authentication/profile#public-fields),
- log in with the e-mail, when the account was created with a `username`.

An e-mail confirmed through [signup confirmation](/authentication/signup#signup-confirmation) is already verified.

## Verifying the e-mail

[`verify_email()`](/api-reference/authentication#verify-email) works in two calls. The user must be signed in.

1. Without arguments, it e-mails a verification code to the user.
2. With the code, it verifies the e-mail.

```python
from skapi import Skapi

skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

print(skapi.verify_email())        # SUCCESS: Verification code has been sent.
code = input("Code from the e-mail: ")
print(skapi.verify_email(code))    # SUCCESS: "email" is verified.
print(skapi.user["email_verified"])  # True
```

The code must be a string. When the e-mail is already verified, `verify_email()` returns `SUCCESS: "email" is verified.` and sends nothing.

To use one of your project's uploaded templates for the code e-mail, pass its message ID: `verify_email(template={"verification": "<message_id>"})`.

Changing the e-mail with [`update_profile()`](/authentication/profile) makes it unverified again.

## Going back to the last verified e-mail

When a user changed their e-mail and has not verified the new one, [`last_verified_email()`](/api-reference/authentication#last-verified-email) returns their previous verified address. `last_verified_email(True)` switches the account back to that address, verified, and returns the updated profile.

```python
print(skapi.last_verified_email())   # 'old@example.com'
user = skapi.last_verified_email(True)
print(user["email"])                 # old@example.com
```

When the current e-mail is verified, it returns the current e-mail. When there is no earlier verified address, it raises `NOT_EXISTS`.
