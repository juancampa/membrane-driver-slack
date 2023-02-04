# Slack Driver

This [driver](https://membrane.io) lets you interact with the Slack API through your Membrane graph.

## Actions

Configure the driver to use your API token (hint: it starts with "xoxb-")

$~~~~$ `mctl action 'slack:configure(apiToken:"xoxb-<your Slack API token here>")'`

# Schema

### Types
```javascript
<Root>
    - Fields
        app -> Ref <App>
        status() -> String
    - Events
        onComand(token) -> <CommandEvent>
<App>
    - Fields
        channel -> <Channel>
        trigger -> <Trigger>
        view -> <View>
<Channel>
    - Actions
       sendMessage(text) -> Void
<Trigger>
    - Actions
        respond(json, view) -> Void
        openView(view) -> Void
<View>
    - Actions
       update(view) -> Void
    - Events
        onSubmit(token) -> <SubmitEvent>