import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { generateResponse } from '../ai/geminiProvider.js';
import { ApiError }         from '../utils/ApiError.js';
import { ApiResponse }      from '../utils/ApiResponse.js';
import { asyncHandler }     from '../utils/asyncHandler.js';
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

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ user: req.user._id })
    .select('title lastMessage createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json(new ApiResponse(200, {
    conversations: conversations.map(sanitizeConversation),
  }));
});

export const getConversation = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid conversation ID');

  const conv = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
  if (!conv) throw new ApiError(404, 'Conversation not found');

  res.json(new ApiResponse(200, {
    messages: conv.messages.map(sanitizeMessage),
  }));
});

export const createConversation = asyncHandler(async (req, res) => {
  const title = req.body.title?.toString().trim().slice(0, 120) || 'New Chat';

  const conv = await Conversation.create({
    user:  req.user._id,
    title,
    model: 'BLINKUS TRADE AGENT 1.0',
  });

  res.status(201).json(new ApiResponse(201, {
    conversation: sanitizeConversation(conv),
  }));
});

export const sendMessage = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid conversation ID');

  const content = req.body.content?.toString().trim();
  if (!content) throw new ApiError(400, 'Message content is required');

  const conv = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
  if (!conv) throw new ApiError(404, 'Conversation not found');

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
  await incrementAiUsage(req.user._id);

  const saved = conv.messages[conv.messages.length - 1];

  res.json(new ApiResponse(200, {
    message: sanitizeMessage(saved),
    usage:   { total: tokens.total },
  }));
});

export const deleteConversation = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid conversation ID');

  const conv = await Conversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!conv) throw new ApiError(404, 'Conversation not found');

  res.json(new ApiResponse(200, null, 'Conversation deleted'));
});
