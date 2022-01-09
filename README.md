# Slack Connector

This connector lets you interact with the Slack API through your Membrane graph.

# Usage

Run the connector on your account
```
$ git clone https://github.com/membrane-io/membrane-connector-slack
$ cd membrane-connector-slack
$ mctl update slack
```

Configure the connector to use your API token (hint: it starts with "xoxb-")
```
mctl action 'slack:configure(apiToken:"xoxb-<your Slack API token here>")'
```

# Examples

_TODO_
