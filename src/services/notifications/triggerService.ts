import { notificationService } from "./notificationService";


async function sendPush(userId: string, title: string, message: string, url?: string) {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, title, body: message, url }),
    });
  } catch (err) {
    // Non-blocking: push failures should never break the in-app experience
    console.debug("Push send skipped or failed", err);
  }
}

export const triggerNotification = {
  async system(userId: string, title: string, message: string, link?: string) {
    await notificationService.createNotification(userId, "system", title, message, link);
  },

  async like(userId: string, postId: string, likerName: string) {
    await notificationService.createNotification(
      userId,
      "like",
      "New Like",
      `${likerName} liked your post.`,
      `/post/${postId}`
    );
    sendPush(userId, "New Like", `${likerName} liked your post.`, `/post/${postId}`);
  },

  async comment(userId: string, postId: string, commenterName: string, text: string) {
    await notificationService.createNotification(
      userId,
      "comment",
      "New Comment",
      `${commenterName} commented: ${text}`,
      `/post/${postId}`
    );
    sendPush(userId, "New Comment", `${commenterName} commented: ${text}`, `/post/${postId}`);
  },

  async accommodationInterest(ownerId: string, accommodationId: string, title: string, senderName: string) {
    await notificationService.createNotification(
      ownerId,
      "accommodation",
      "Accommodation Interest",
      `${senderName} is interested in ${title}.`,
      `/accommodation/${accommodationId}`
    );
    sendPush(ownerId, "Accommodation Interest", `${senderName} is interested in ${title}.`, `/accommodation/${accommodationId}`);
  },

  async message(receiverId: string, senderName: string, text: string) {
    await notificationService.createNotification(
      receiverId,
      "message",
      "New Message",
      `${senderName}: ${text}`,
      `/messages`
    );
    sendPush(receiverId, "New Message", `${senderName}: ${text}`, `/messages`);
  },
};