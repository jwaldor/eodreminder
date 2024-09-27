// `nodes` contain any nodes you add from the graph (dependencies)
// `root` is a reference to this program's root node
// `state` is an object that persists across program updates. Store data here.
import { root, nodes, state } from "membrane";

// INSTRUCTIONS:
//  1. Change the URL to be polled below
//  2. Find this action in the graph and select "Invoke At Schedule" to run it as a cronjob

//Setup (assuming Slack bot is already added to workspace):
//Add bot to channel by doing @(BotName) in chat

export async function configure() {
  root.poll.$cron("0 0 11 * * *");
}
export async function poll() {
  if (new Date().getDay() !== 1) {
    //check if it's a Monday
    const messages = await nodes.channel.messages
      .page()
      .items.$query(" { ts user text } ");
    // Function to convert Slack timestmp (e.g., '1727451475.730079') to a Date object
    const convertSlackTsToDate = (slackTs: string): Date => {
      const tsInSeconds = parseFloat(slackTs); // Convert Slack ts to seconds (Unix timestamp)
      return new Date(tsInSeconds * 1000); // Convert to milliseconds and return a Date object
    };

    // Function to get the start of a given day
    const getStartOfDay = (date: Date): Date => {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    // Get today's date and yesterday's date
    const today = new Date();
    const startOfToday = getStartOfDay(today);
    const startOfYesterday = new Date(startOfToday);
    const startOf5Days = new Date(startOfToday);
    startOfYesterday.setDate(today.getDate() - 1); // Subtract 1 day for yesterday's start
    startOf5Days.setDate(today.getDate() - 5);
    // Arrays to store messages
    const recentMessages: Array<{ ts: string; user: string }> = [];
    const olderMessages: Array<{ ts: string; user: string }> = [];

    // Split the messages into recent (today and yesterday) and older
    messages.forEach((message) => {
      if (message.user !== "U0764BM894M") {
        // checks if user is Andrew

        const lowermessage = message.text?.toLowerCase();
        const wasareport =
          lowermessage &&
          (lowermessage.includes("pr") ||
            lowermessage.includes("block") ||
            lowermessage.includes("learn"));
        if (message.ts && wasareport) {
          const messageDate = convertSlackTsToDate(message.ts);

          if (messageDate >= startOfYesterday) {
            recentMessages.push(message); // Messages from today and yesterday
          } else if (messageDate >= startOf5Days) {
            olderMessages.push(message); // Messages older than yesterday
          }
        } else {
          console.log(
            "message timestamp not defined, or message was not an EOD report",
            message.user
          );
        }
      }
    });
    const oldposters = olderMessages.map((message) => message.user);
    const recentposters = recentMessages.map((message) => message.user);
    const people_to_remind = oldposters.filter(
      (value) => !recentposters.includes(value)
    );
    const uniquePeople = [...new Set(people_to_remind)];
    const people_string = uniquePeople
      .map((person) => `<@${person}>`)
      .join(" ");
    await nodes.channel.sendMessage({
      text: `${people_string} Friendly automated EOD report reminder: if you are mentioned here, you have not submitted an EOD report for yesterday. I'm rooting for you!`,
    });
  }
}
