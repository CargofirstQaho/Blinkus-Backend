import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { generateResponse } from '../../../ai/geminiProvider.js';
import { errorHandler } from '../../../utils/errorHandler.js';
import { incrementAiUsage } from '../services/usageService.js';

const { Types: { ObjectId } } = mongoose;

function isValidId(id) {
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

function sanitizeConversation(conv) {
  return {
    _id:         conv._id.toString(),
    title:       conv.title,
    lastMessage: conv.lastMessage,
    createdAt:   conv.createdAt,
    updatedAt:   conv.updatedAt,
  };
}

function sanitizeMessage(msg) {
  return {
    _id:     msg._id.toString(),
    role:    msg.role,
    content: msg.content,
  };
}

export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ user: req.user._id })
      .select('title lastMessage createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50);

    return res.json({ success: true, message: 'Success', data: {
      conversations: conversations.map(sanitizeConversation),
    }});
  } catch (error) {
    return next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return next(errorHandler(400, 'Invalid conversation ID'));

    const conv = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
    if (!conv) return next(errorHandler(404, 'Conversation not found'));

    return res.json({ success: true, message: 'Success', data: {
      messages: conv.messages.map(sanitizeMessage),
    }});
  } catch (error) {
    return next(error);
  }
};

export const createConversation = async (req, res, next) => {
  try {
    const title = req.body.title?.toString().trim().slice(0, 120) || 'New Chat';

    const conv = await Conversation.create({
      user:  req.user._id,
      title,
      model: 'BLINKUS TRADE AGENT 1.0',
    });

    return res.status(201).json({ success: true, message: 'Conversation created', data: {
      conversation: sanitizeConversation(conv),
    }});
  } catch (error) {
    return next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return next(errorHandler(400, 'Invalid conversation ID'));

    const content = req.body.content?.toString().trim();
    if (!content) return next(errorHandler(400, 'Message content is required'));

    const conv = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
    if (!conv) return next(errorHandler(404, 'Conversation not found'));

    conv.messages.push({ role: 'user', content });

    const aiMessages = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    const { content: aiText, tokens } = await generateResponse(aiMessages, conv.model);

    conv.messages.push({ role: 'model', content: aiText, tokens: tokens.total });
    conv.lastMessage  = aiText.slice(0, 120);
    conv.totalTokens += tokens.total;

    if (conv.title === 'New Chat' && conv.messages.length <= 3) {
      conv.title = content.slice(0, 60);
    }

    await conv.save();
    if (!req.aiUsageBypassed) {
      await incrementAiUsage(req.user._id);
    }

    const saved = conv.messages[conv.messages.length - 1];

    return res.json({ success: true, message: 'Success', data: {
      message: sanitizeMessage(saved),
      usage:   { total: tokens.total },
    }});
  } catch (error) {
    return next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return next(errorHandler(400, 'Invalid conversation ID'));

    const conv = await Conversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!conv) return next(errorHandler(404, 'Conversation not found'));

    return res.json({ success: true, message: 'Conversation deleted', data: null });
  } catch (error) {
    return next(error);
  }
};
