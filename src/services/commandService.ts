export function processCommand(command: string): {
  action: string;
  url?: string;
  isBrowserAction: boolean;
} {
  const lowerCmd = command.toLowerCase().trim();

  // General Browsing: "Open [website name]"
  const openMatch = lowerCmd.match(/^open\s+(.+)$/);
  if (
    openMatch &&
    !lowerCmd.includes("youtube") &&
    !lowerCmd.includes("spotify")
  ) {
    let website = openMatch[1].trim().replace(/\s+/g, "");
    if (!website.includes(".")) {
      website += ".com";
    }
    return {
      action: `Very good, sir. Opening ${openMatch[1]} now.`,
      url: `https://www.${website}`,
      isBrowserAction: true,
    };
  }

  // Media Search: "Play [song/video] on YouTube"
  const ytMatch = lowerCmd.match(/^play\s+(.+?)\s+on\s+youtube$/);
  if (ytMatch) {
    const query = ytMatch[1].trim();
    return {
      action: `Indeed, sir. Playing ${query} on YouTube.`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      videoUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}&autoplay=1&mute=1`,
      isBrowserAction: true,
    } as any;
  }

  // Media Search: "Search [query] on Spotify"
  const spotifyMatch = lowerCmd.match(/^search\s+(.+?)\s+on\s+spotify$/);
  if (spotifyMatch) {
    const query = encodeURIComponent(spotifyMatch[1].trim());
    return {
      action: `Quite right, sir. Searching for ${spotifyMatch[1]} on Spotify.`,
      url: `https://open.spotify.com/search/${query}`,
      isBrowserAction: true,
    };
  }

  // WhatsApp Web: "Send a WhatsApp message to [number] saying [message]"
  const waMatch = lowerCmd.match(
    /^send\s+a\s+whatsapp\s+message\s+to\s+([\d\+\s]+)\s+saying\s+(.+)$/,
  );
  if (waMatch) {
    const number = waMatch[1].replace(/\s+/g, "");
    const message = encodeURIComponent(waMatch[2].trim());
    return {
      action: `As you wish, sir. Preparing your message for transmission.`,
      url: `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      isBrowserAction: true,
    };
  }

  // Music Genres: "Play [genre] music"
  const genreMatch = lowerCmd.match(/^play\s+(.+?)\s+music$/);
  if (genreMatch) {
    const genre = genreMatch[1].trim();
    return {
      action: `Very good, sir. Initiating a ${genre} auditory stream.`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(genre + ' music')}`,
      videoUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(genre + ' music')}&autoplay=1&mute=1`,
      isBrowserAction: true,
    } as any;
  }

  // Reminders: "Set a reminder for [topic]"
  const reminderMatch = lowerCmd.match(/^set\s+a\s+reminder\s+for\s+(.+)$/);
  if (reminderMatch) {
    const topic = reminderMatch[1].trim();
    const subject = encodeURIComponent(`Reminder: ${topic}`);
    return {
      action: `I've prepared a reminder for ${topic}, sir. I suggest confirming the schedule.`,
      url: `https://calendar.google.com/calendar/u/0/r/eventedit?text=${subject}`,
      isBrowserAction: true,
    };
  }

  // News: "Get the latest news on [topic]"
  const newsMatch = lowerCmd.match(/^get\s+the\s+latest\s+news\s+on\s+(.+)$/);
  if (newsMatch) {
    const topic = newsMatch[1].trim();
    const query = encodeURIComponent(topic);
    return {
      action: `Scanning global frequencies for ${topic} intelligence, sir.`,
      url: `https://news.google.com/search?q=${query}`,
      isBrowserAction: true,
    };
  }

  return { action: "", isBrowserAction: false };
}
