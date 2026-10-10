import { useTitle } from "../publicApi.js";

export function Terms() {
  useTitle("Terms of service");
  return (
    <main className="page narrow prose">
      <header className="page-head">
        <p className="eyebrow">Legal</p>
        <h1>Terms of service</h1>
      </header>
      <p>
        By using PhoenixBot in your server, you agree to these terms. Breaking them can get your server's
        data reset or the server blacklisted from Phoenix.
      </p>
      <p>If your server is blacklisted, you can appeal in the <a href="/server">PhoenixBot support server</a>.</p>
      <h2>Rules</h2>
      <p>When using PhoenixBot, you may not use it to:</p>
      <ul>
        <li>Harass people. Don't use Phoenix's commands to attack anyone.</li>
        <li>Promote scams, including through people's DMs. We don't tolerate scams of any kind.</li>
        <li>Post illegal content. Servers found doing this will be blacklisted.</li>
      </ul>
      <h2>Reporting</h2>
      <p>
        To report someone for breaking these terms, ask in the support channel of the PhoenixBot server.
        Please include screenshots so we can see what happened. Thank you for using PhoenixBot.
      </p>
    </main>
  );
}

export function Privacy() {
  useTitle("Privacy policy");
  return (
    <main className="page narrow prose">
      <header className="page-head">
        <p className="eyebrow">Legal</p>
        <h1>Privacy policy</h1>
      </header>
      <p>
        By using PhoenixBot in your server, you agree to this privacy policy. Phoenix is open source, so
        you can always <a href="https://github.com/team-custard/phoenixbot">read the code</a> to see what it does, and
        suggest changes to it or to this policy.
      </p>
      <h2>UserDB</h2>
      <p>
        UserDB lets other people see your time zone and pronouns. It's only used if you set it up, and you
        can opt out at any time; your time zone and pronouns are then deleted right away. By using UserDB
        you agree to that information being public, through the bot, the website and the API.
      </p>
      <h2>Server data</h2>
      <p>
        When Phoenix is added to a server, it creates a settings record for that server. It stores the
        settings admins choose, moderation cases and leveling progress. This data is not sold to anyone.
        Server data is kept until you ask the bot developer to delete it.
      </p>
      <p>
        If a server uses leveling and keeps its leaderboard public (the default), the top 100 members'
        names, avatars and levels can be seen by anyone with the link. Admins can turn this off on the
        dashboard.
      </p>
      <h2>Logs</h2>
      <p>
        Phoenix tells its staff when it's added to a server and when an error happens. This is used to
        enforce the terms of service and to fix bugs.
      </p>
      <h2>Dashboard</h2>
      <p>
        Logging in to the dashboard with Discord gives Phoenix your username, avatar and list of servers,
        which it uses to show which servers you can manage. Your login is kept in a cookie until you log
        out or it expires.
      </p>
      <p>Questions? Ask in our <a href="/server">Discord server</a>.</p>
    </main>
  );
}
