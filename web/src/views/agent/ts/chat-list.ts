import { message } from "ant-design-vue";
import type { ChatModel, MessageModel, User } from "@advanced-chat/components";
import type { ComputedRef, Ref } from "vue";
import {
  createConversation,
  getConversationMessages,
  getConversations,
} from "@/api/agent";
import { joinChat, type AppSocket } from "@/utils/socket";
import type { ChatMessageDto, ConversationDto } from "../types";
import { toMessageModel } from "../utils";

export interface ChatListContext {
  socket: AppSocket;
  currentUser: ComputedRef<User>;
  assistantUser: User;
  chats: Ref<ChatModel[]>;
  activeChat: Ref<ChatModel>;
  messagesText: Ref<MessageModel[]>;
  chatsLoaded: Ref<boolean>;
  messagesLoaded: Ref<boolean>;
}

export function createChatListHandlers(context: ChatListContext) {
  const {
    socket,
    currentUser,
    assistantUser,
    chats,
    activeChat,
    messagesText,
    chatsLoaded,
    messagesLoaded,
  } = context;

  async function handleOpenChat(chat: ChatModel): Promise<void> {
    if (chat.id === activeChat.value.id) {
      return;
    }

    try {
      messagesLoaded.value = false;
      const previousConversationId = activeChat.value.id;
      activeChat.value = chat;
      messagesText.value = [];

      if (previousConversationId) {
        socket.emit("chat:leave", previousConversationId);
      }

      const response = await getConversationMessages(chat.id);
      messagesText.value = response.data.map((item) =>
        toMessageModel(item, currentUser, assistantUser),
      );

      joinChat(chat.id);
    } catch (error) {
      console.error("切换会话失败", error);
      message.error("切换会话失败");
    } finally {
      messagesLoaded.value = true;
    }
  }

  async function handleAddChat(): Promise<void> {
    try {
      const response = await createConversation();
      const conversation = response.data;
      const previousConversationId = activeChat.value.id;

      const newChat: ChatModel = {
        id: conversation._id,
        name: conversation.title,
        users: [currentUser.value, assistantUser],
        typingUsers: [],
      };

      chats.value = [newChat, ...chats.value];
      activeChat.value = newChat;
      messagesText.value = [];

      if (previousConversationId) {
        socket.emit("chat:leave", previousConversationId);
      }
      joinChat(newChat.id);
    } catch (error) {
      console.error("创建会话失败", error);
      message.error("创建会话失败");
    }
  }

  async function initializeChat(): Promise<void> {
    chatsLoaded.value = false;
    messagesLoaded.value = false;

    try {
      const conversationResponse = await getConversations();
      let conversations: ConversationDto[] = conversationResponse.data;

      if (!conversations.length) {
        const createResponse = await createConversation();
        conversations = [createResponse.data];
      }

      const conversationChats: ChatModel[] = conversations.map(
        (conversation) => ({
          id: conversation._id,
          name: conversation.title,
          users: [currentUser.value, assistantUser],
          typingUsers: [],
        }),
      );

      chats.value = conversationChats;

      const firstChat = conversationChats[0];
      activeChat.value = firstChat;

      const messageResponse = await getConversationMessages(firstChat.id);
      messagesText.value = messageResponse.data.map((item: ChatMessageDto) =>
        toMessageModel(item, currentUser, assistantUser),
      );

      joinChat(firstChat.id);
    } catch (error) {
      console.error("初始化会话失败：", error);
      message.error("加载会话失败");
    } finally {
      chatsLoaded.value = true;
      messagesLoaded.value = true;
    }
  }

  return {
    handleOpenChat,
    handleAddChat,
    initializeChat,
  };
}
