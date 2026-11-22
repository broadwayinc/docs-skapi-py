# Errors

Every error skapi-py raises is a `SkapiError` with two fields:

- `code`: a short name you can check in code, such as `INVALID_PARAMETER`.
- `message`: what went wrong, in plain words.

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

try:
    skapi.login("user@example.com", "wrong password")
except SkapiError as err:
    print(err.code)     # INCORRECT_USERNAME_OR_PASSWORD
    print(err.message)  # Incorrect username or password.
```

The codes are the same ones skapi-js uses, so a check written for one works for the other.

## Common codes

| code | meaning |
|---|---|
| `INVALID_PARAMETER` | A value you passed is missing, the wrong type, or out of range. The message names it. Nothing was sent. |
| `INVALID_REQUEST` | The call is not allowed in this state, for example `User login is required.` |
| `NOT_EXISTS` | The record, file, account or project does not exist. |
| `EXISTS` | It already exists, for example an account with that e-mail. |
| `INCORRECT_USERNAME_OR_PASSWORD` | Wrong e-mail, username or password. |
| `MFA_REQUIRED` | The password was right and the account has two-step login on: call `verify_mfa()` with the code. See [Two-Step Login](/authentication/mfa). |
| `INVALID_CODE` | Wrong authenticator code. Try the next one. |
| `SIGNUP_CONFIRMATION_NEEDED` | The user has not confirmed their signup yet. |
| `USER_IS_DISABLED` | The account is disabled. See [User Profile](/authentication/profile). |
| `REQUIRE_LOGIN` | The project only lets signed-in users read its database. |
| `REQUEST_EXCEED` | Too many attempts. Wait and try again. |
| `TOO_MANY_REQUESTS` | The server kept answering "too many requests" after 6 automatic retries. |
| `NETWORK_ERROR` | No answer came back. The user stays signed in; try again when the network is back. |
| `TIMEOUT` | Nothing was sent or received for `timeout` seconds (`No response for 120 seconds.` with the default), or a file upload stalled (`Upload timeout: ...`). Try again. |
| `EXCEED_LIMIT` | The project is at a limit of its plan. On Trial and Standard, once the month's API requests are used up, every call is refused until the month ends with `This project has used its 500,000 API requests for this month. Requests are refused until the month ends. Consider upgrading your plan.` (the number is the plan's own limit). See [Plans and Limits](https://docs.skapi.com/introduction/plans.html#api-requests). |
| `ERROR` | Anything else. The message says what happened. |

## Retries

skapi-py retries on its own when the server asks it to slow down (it waits as long as the server says, up to 6 times), and when a token refresh fails for lack of network (up to about 6 seconds). Other errors are raised at once.
