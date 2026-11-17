# Passwords

Passwords are 6 to 60 characters.

## Changing the password

A signed-in user changes their password with [`change_password()`](/api-reference/authentication#change-password), giving the current one and the new one.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

try:
    print(skapi.change_password("password", "new password"))  # SUCCESS: Password has been changed.
except SkapiError as err:
    if err.code == "INVALID_REQUEST":
        print(err.message)  # Incorrect password.
    else:
        raise
```

## Forgot password

A user who cannot log in resets the password in two steps. The reset code is always sent by e-mail, so a user whose e-mail is not [verified](/authentication/email-verification) may not receive it. Encourage users to verify their e-mail.

### Step 1: send the code

[`forgot_password()`](/api-reference/authentication#forgot-password) e-mails a reset code to the account.

```python
print(skapi.forgot_password("user@example.com"))  # SUCCESS: Verification code has been sent.
```

To use one of your project's uploaded templates for this e-mail, pass its message ID: `forgot_password("user@example.com", {"forgot_password": "<message_id>"})`.

### Step 2: set the new password

[`reset_password()`](/api-reference/authentication#reset-password) takes the e-mail, the code from the e-mail, and the new password.

```python
print(skapi.reset_password("user@example.com", "123456", "new password"))
# SUCCESS: New password has been set.
```

Resetting the password does not turn off [two-step login](/authentication/mfa#lost-phone). It does sign the account out on every other device: each one is signed out the next time it refreshes its login (within a day at most).
