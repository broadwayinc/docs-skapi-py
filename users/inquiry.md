# Inquiries

[`send_inquiry()`](/api-reference/users#send-inquiry) sends a message to the project owner's e-mail. Anyone can send one, signed in or not:

```python
from skapi import Skapi, SkapiError

skapi = Skapi("<Project ID>")

try:
    res = skapi.send_inquiry({
        "name": "John Doe",
        "email": "john@doe.com",
        "subject": "Inquiry",
        "message": "Hello, I have a question.",
    })
    print(res)  # 'SUCCESS: Inquiry has been sent.'
except SkapiError as err:
    print(err.code, err.message)
```

All four keys are required. `email` has to be a valid address.

The project owner can turn inquiries off in the project settings on [skapi.com](https://www.skapi.com). The call then fails with `ERROR` `Project does not allow inquiry.`
