export interface KyrosUser {
  uid: string;
  displayName: string;
  email?: string;
}

export async function initializeUserPreferences(userId: string) {
    try {
        await fetch(`/api/user/${userId}/prefs`);
    } catch (e) {
        console.error("Failed to initialize user preferences:", e);
    }
}

export async function getUserPreferences(userId: string) {
    try {
        const res = await fetch(`/api/user/${userId}/prefs`);
        const data = await res.json();
        if (data.status === "success") {
            return data.prefs;
        }
        return { isMuted: false };
    } catch (e) {
        console.error("Failed to get user preferences:", e);
        return { isMuted: false };
    }
}

export async function updateUserMutePreference(userId: string, isMuted: boolean) {
    try {
        await fetch(`/api/user/${userId}/prefs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isMuted })
        });
    } catch (e) {
        console.error("Failed to update mute preference:", e);
    }
}

export interface ChatMessage {
    id: string;
    userId: string;
    sender: "user" | "kyros";
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    timestamp: any;
}

export async function saveMessage(message: ChatMessage) {
    try {
        await fetch(`/api/user/${message.userId}/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message)
        });
    } catch (e) {
        console.error("Failed to save message:", e);
    }
}

export async function getChatHistory(userId: string) {
    try {
        const res = await fetch(`/api/user/${userId}/messages`);
        const data = await res.json();
        if (data.status === "success") {
            return data.messages;
        }
        return [];
    } catch (e) {
        console.error("Failed to get chat history:", e);
        return [];
    }
}
