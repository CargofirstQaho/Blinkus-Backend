import {
  createBillingAddress,
  getUserBillingAddresses,
  getBillingAddressById,
  updateBillingAddress,
  deleteBillingAddress,
} from '../services/billingService.js';

export const createBillingAddressController = async (req, res, next) => {
  try {
    const userId  = req.user._id;
    const address = await createBillingAddress(userId, req.body);
    return res.status(201).json({ success: true, data: address });
  } catch (err) {
    return next(err);
  }
};

export const getUserBillingAddressesController = async (req, res, next) => {
  try {
    const userId    = req.user._id;
    const addresses = await getUserBillingAddresses(userId);
    return res.status(200).json({ success: true, data: addresses });
  } catch (err) {
    return next(err);
  }
};

export const getBillingAddressByIdController = async (req, res, next) => {
  try {
    const userId    = req.user._id;
    const addressId = req.params.billingAddressId;
    const address   = await getBillingAddressById(addressId, userId);
    return res.status(200).json({ success: true, data: address });
  } catch (err) {
    return next(err);
  }
};

export const updateBillingAddressController = async (req, res, next) => {
  try {
    const userId    = req.user._id;
    const addressId = req.params.billingAddressId;
    const address   = await updateBillingAddress(addressId, userId, req.body);
    return res.status(200).json({ success: true, data: address });
  } catch (err) {
    return next(err);
  }
};

export const deleteBillingAddressController = async (req, res, next) => {
  try {
    const userId    = req.user._id;
    const addressId = req.params.billingAddressId;
    const result    = await deleteBillingAddress(addressId, userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
};


     
