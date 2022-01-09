const { http } = M.nodes;
export const state: any = {};

const api = async (method: 'GET' | 'POST', path: string, body?: string | object) => {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.token}`
  };
  const res = await http.resource({
    method,
    url: 'https://slack.com/api/' + path,
    headers: JSON.stringify(headers),
    body: typeof body === 'object' ? JSON.stringify(body) : body
  }).$query('{ body }');
  return res.body
}
let next_external_id = 1;

export const Root = {
  configure: async ({ args }) => {
    state.token = args.apiToken;
    let res = await api('GET', 'auth.test');
    try {
      const { ok, user, user_id, team, team_id, error } = JSON.parse(res);
      if (ok) {
        return `Configured for user "${user}" (${user_id}) on team "${team}" (${team_id})"`
      } else {
        return `Failed to configure: ${error}`;
      }
    } catch (e) {
      return `Failed to parse slack response: ${res}`
    }
  },

  webhook: async ({ args: { method, path, body }}) => {
    if (!body || !path || !method) {
      return;
    }

    let event = JSON.parse(body);
    let type;
    if (!event.api_app_id && event.payload) {
      event = JSON.parse(event.payload);
      type = event.type;
    } else {
      type = 'command';
    }
    const app = M.root.app({ id: event.api_app_id });
    console.log(`Webhook type ${type}`);

    switch (type) {
      case "command": {
        const { response_url, trigger_id } = event;
        event.trigger = app.trigger({ response_url, trigger_id });
        event.channel = app.channel({ name: event.channel_name });
        app.onCommand({ command: event.command }).$emit(event);
        break;
      }
      case "view_submission": {
        const { view: { external_id, state, trigger_id } } = event;
        const e = {
          state: JSON.stringify(event.view.state),
          user: null, // TODO
          user_id: event.user.id,
          user_name: event.user.name,
          team: null, // TODO
          team_id: event.team.id,
          team_domain: event.team.domain,
          event: body
        };
        event.trigger = app.trigger({ trigger_id });
        app.view({ external_id }).onSubmit.$emit(e);
        break;
      }
    }

    return ``;
  },
}

export const View = {
  async update({ self, args: { view: viewJson } }) {
    const { external_id } = self.$argsAt(M.root.app.view);
    const view = JSON.parse(viewJson);
    view.external_id = external_id;
    await api("POST", "views.update", { external_id, view });
  }
}

export const Channel = {
  async sendMessage({ self, args: { body } }) {
    const { name } = self.$argsAt(M.root.app.channel);
  }
}

export const Trigger = {
  async respond({ self, args: { json, text } }) {
    const { response_url } = self.$argsAt(M.root.app.trigger);
    const contentType = json ? 'application/json' : 'text/plain';
    const body = json ? json : JSON.stringify({ text });
    await http.resource({
      url: response_url,
      method: 'POST', 
      headers: JSON.stringify({ 'Content-Type': contentType }),
      body
    }).$query('{ body }');
  },

  async openView({ self, args: { view: viewJson } }) {
    const { id: app_id } = self.$argsAt(M.root.app);
    const { trigger_id } = self.$argsAt(M.root.app.trigger);
    const view = JSON.parse(viewJson);
    const external_id = view.external_id = view.external_id || `view-${next_external_id++}`;
    await api("POST", "views.open", { trigger_id, view });
    return M.root.app({ id: app_id }).view({ external_id });
  },

}
