import fetch from "node-fetch";
import { state, nodes, root } from "membrane";

async function api(method: "GET" | "POST", path: string, query?: any, body?: string | object) {
  if (query) {
    Object.keys(query).forEach((key) => (query[key] === undefined ? delete query[key] : {}));
  }
  const querystr = query && Object.keys(query).length ? `?${new URLSearchParams(query)}` : "";

  return await fetch(`https://slack.com/api/${path}${querystr}`, {
    method,
    body: typeof body === "object" ? JSON.stringify(body) : body,
    headers: {
      Authorization: `Bearer ${state.token}`,
      "Content-Type": "application/json",
    },
  });
}

export const Root = {
  configure: async ({ args }) => {
    state.token = args.apiToken;
    let res = await api("GET", "auth.test");
    try {
      const { ok, user, user_id, team, team_id, error } = await res
        .json()
        .then((json: any) => json && json);
      if (ok) {
        return `Configured for user "${user}" (${user_id}) on team "${team}" (${team_id})"`;
      } else {
        return `Failed to configure: ${error}`;
      }
    } catch (e) {
      return `Failed to parse slack response: ${res}`;
    }
  },
  status() {
    if (!state.token) {
      return "Please [configure the Slack token](https://api.slack.com/authentication/token-types#bot)";
    } else {
      return `Ready`;
    }
  },
  channels: () => ({}),
  users: () => ({}),
  parse({ args: { name, value } }) {
    switch (name) {
      case "user": {
        const [id] = value.match(/[^"]*$/g);
        return [root.users.one({ id })];
      }
      case "channel": {
        const [id] = value.match(/[^"]*$/g);
        return [root.channels.one({ id })];
      }
      case "message": {
        const [id] = value.match(/[^"]*$/g);
        // return [root.channels.one({ id }).messages.one({ ts: id })];
      }
    }
    return [];
  },
  // dm: async ({ self, args: { users } }) => {
  //   const { id } = self.$argsAt(root.channels.one);
  //   await api("POST", "conversations.open", null, {
  //     users,
  //   });
  // }
};

export const ChannelCollection = {
  one: async ({ args: { id } }) => {
    const res = await api("GET", "conversations.info", {
      channel: id,
    });
    const { channel } = await res.json();
    return channel;
  },
  page: async ({ self, args }) => {
    const res = await api("GET", "conversations.list", {
      ...args,
    });
    const { channels, response_metadata } = await res.json();
    return {
      items: channels,
      next: self.page({ cursor: response_metadata.next_cursor }),
    };
  },
  create: async ({ args: { name, is_private } }) => {
    await api("POST", "conversations.create", null, {
      name,
      is_private,
    });
  },
};

export const UserCollection = {
  one: async ({ args: { id } }) => {
    const res = await api("GET", "users.info", {
      user: id,
    });
    const { user } = await res.json();
    return user;
  },
  page: async ({ self, args }) => {
    const res = await api("GET", "users.list", {
      ...args,
    });
    const { members, response_metadata } = await res.json();
    return {
      items: members,
      next: self.page({ cursor: response_metadata.next_cursor }),
    };
  },
};

export const MemberCollection = {
  one: async ({ args: { id } }) => {
    const res = await api("GET", "users.info", {
      user: id,
    });
    const { user } = await res.json();
    return user;
  },
  page: async ({ self, args }) => {
    const { id } = self.$argsAt(root.channels.one);
    const res = await api("GET", "conversations.members", {
      ...args,
      channel: id,
    });
    const { members, response_metadata } = await res.json();
    return {
      items: members.map((id) => ({ id })),
      next: self.page({ cursor: response_metadata.next_cursor }),
    };
  },
};

export const MessageCollection = {
  one: async ({ self, args: { ts } }) => {
    const { id } = self.$argsAt(root.channels.one);
    const res = await api("GET", "conversations.history", {
      latest: ts,
      limit: 1,
      inclusive: true,
      channel: id,
    });
    const { messages } = await res.json();
    return messages[0];
  },
  page: async ({ self, args }) => {
    const { id } = self.$argsAt(root.channels.one);
    const res = await api("GET", "conversations.history", {
      ...args,
      channel: id,
    });
    const { messages } = await res.json();
    const lastMessage = messages[messages.length - 1];
    return {
      items: messages,
      next: self.page({ latest: lastMessage.ts, limit: args.limit }),
    };
  },
};

export const User = {
  gref: ({ obj }) => {
    return root.users.one({ id: obj.id });
  },
};

export const Channel = {
  gref: ({ obj }) => {
    return root.channels.one({ id: obj.id });
  },
  members: () => ({}),
  // to read messages, /invite @bot to the channel
  messages: () => ({}),
  invite: async ({ self, args: { users } }) => {
    const { id } = self.$argsAt(root.channels.one);
    await api("POST", "conversations.invite", null, {
      channel: id,
      users: users,
    });
  },
  leave: async ({ self }) => {
    const { id } = self.$argsAt(root.channels.one);
    await api("POST", "conversations.leave", null, {
      channel: id,
    });
  },
  sendMessage: async ({ self, args }) => {
    const { id } = self.$argsAt(root.channels.one);
    await api("POST", "chat.postMessage", null, {
      channel: id,
      ...args,
    });
  },
};

export const Member = {
  gref: ({ obj }) => {
    return root.users.one({ id: obj.id });
  },
};

export const Message = {
  gref: ({ self, obj }) => {
    const { id } = self.$argsAt(root.channels.one);
    return root.channels.one({ id }).messages.one({ ts: obj.ts });
  },
};
