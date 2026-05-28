import Conversation from '../models/Conversation.js';
import { generateResponse } from '../ai/geminiProvider.js';
import { ApiError }    from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { incrementAiUsage } from '../services/usageService.js';

export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({ user: req.user._id })
    .select('title lastMessage model updatedAt')
    .sort({ updatedAt: -1 })
    .limit(50);

  res.json(new ApiResponse(200, { conversations }));
});

export const getConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
  if (!conv) throw new ApiError(404, 'Conversation not found');
  res.json(new ApiResponse(200, { messages: conv.messages, model: "BLINKUS TRADE AGENT 1.0" }));
});

export const createConversation = asyncHandler(async (req, res) => {
  const { title, model } = req.body;
  const conv = await Conversation.create({
    user:  req.user._id,
    title: title || 'New Chat',
    model: "BLINKUS TRADE AGENT 1.0",
  }); 
  res.status(201).json(new ApiResponse(201, { conversation: conv }));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { content, model } = req.body;
  if (!content?.trim()) throw new ApiError(400, 'Message content is required');

  const conv = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
  if (!conv) throw new ApiError(404, 'Conversation not found');

  if (model && model !== conv.model) conv.model = model;

  conv.messages.push({ role: 'user', content: content.trim() });

  const aiMessages = conv.messages.map((m) => ({ role: m.role, content: m.content }));
  const { content: aiText, tokens } = await generateResponse(aiMessages, conv.model);

  const aiMessage = { role: 'model', content: aiText, tokens: tokens.total };
  conv.messages.push(aiMessage);
  conv.lastMessage  = aiText.slice(0, 120);
  conv.totalTokens += tokens.total;

  if (conv.title === 'New Chat' && conv.messages.length <= 3) {
    conv.title = content.slice(0, 60);
  }

  await conv.save();

  await incrementAiUsage(req.user._id);

  res.json(new ApiResponse(200, { message: { ...aiMessage, _id: conv.messages[conv.messages.length - 1]._id } }));
});

export const deleteConversation = asyncHandler(async (req, res) => {
  const conv = await Conversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!conv) throw new ApiError(404, 'Conversation not found');
  res.json(new ApiResponse(200, null, 'Conversation deleted'));
});
