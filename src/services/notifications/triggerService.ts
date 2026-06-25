import { notificationService } from "./notificationService";
import { supabase } from "@/lib/supabase/client";

const SEND_PUSH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`;

async function sendPush(userId: string, title: string, message: string, url?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(SEND_PUSH_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ userId, title, message, url }),
    });
  } catch (err) {
    console.error("Push send failed", err);
  }
}

export const triggerNotification = {
  async like(userId: string, postId: string, likerName: string) {
    await notificationService.createNotification(userId, "like", "New Like", `${likerName} liked your post.`);
    await sendPush(userId, "New Like", `${likerName} liked your post.`, `/post/${postId}`);
  },
  async comment(userId: string, postId: string, commenterName: string, text: string) {
    await notificationService.createNotification(userId, "comment", "New Comment", `${commenterName} commented: ${text}`);
    await sendPush(userId, "New Comment", `${commenterName} commented: ${text}`, `/post/${postId}`);
  },
  async accommodationInterest(ownerId: string, accommodationId: string, title: string, senderName: string) {
    await notificationService.createNotification(ownerId, "system", "Accommodation Interest", `${senderName} is interested in ${title}.`);
    await sendPush(ownerId, "Accommodation Interest", `${senderName} is interested in ${title}.`, `/accommodation/${accommodationId}`);
  },
  async message(receiverId: string, senderName: string, text: string) {
    await notificationService.createNotification(receiverId, "message", "New Message", `${senderName}: ${text}`);
    await sendPush(receiverId, "New Message", `${senderName}: ${text}`, `/messages`);
  }
};