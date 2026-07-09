import BillingAddress from '../models/BillingAddress.js';
import { errorHandler } from '../../../utils/errorHandler.js';

export async function createBillingAddress(userId, data) {
  const existing = await BillingAddress.countDocuments({ userId });

  const shouldBeDefault = existing === 0 ? true : (data.isDefault ?? false);

  if (shouldBeDefault) {
    await BillingAddress.updateMany({ userId }, { $set: { isDefault: false } });
  }

  const address = await BillingAddress.create({
    userId,
    fullName:     data.fullName,
    email:        data.email,
    phone:        data.phone,
    companyName:  data.companyName  ?? null,
    country:      data.country,
    state:        data.state,
    city:         data.city,
    postalCode:   data.postalCode,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2 ?? null,
    isDefault:    shouldBeDefault,
  });

  return address;
}

export async function getUserBillingAddresses(userId) {
  return BillingAddress.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
}

export async function getBillingAddressById(addressId, userId) {
  const address = await BillingAddress.findById(addressId);
  if (!address) throw errorHandler(404, 'Billing address not found');
  if (String(address.userId) !== String(userId)) throw errorHandler(403, 'Access denied');
  return address;
}

export async function updateBillingAddress(addressId, userId, data) {
  const address = await BillingAddress.findById(addressId);
  if (!address) throw errorHandler(404, 'Billing address not found');
  if (String(address.userId) !== String(userId)) throw errorHandler(403, 'Access denied');

  if (data.isDefault === true) {
    await BillingAddress.updateMany(
      { userId, _id: { $ne: addressId } },
      { $set: { isDefault: false } }
    );
  }

  Object.assign(address, {
    fullName:     data.fullName,
    email:        data.email,
    phone:        data.phone,
    companyName:  data.companyName  ?? null,
    country:      data.country,
    state:        data.state,
    city:         data.city,
    postalCode:   data.postalCode,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2 ?? null,
    isDefault:    data.isDefault    ?? address.isDefault,
  });

  return address.save();
}

export async function deleteBillingAddress(addressId, userId) {
  const address = await BillingAddress.findById(addressId);
  if (!address) throw errorHandler(404, 'Billing address not found');
  if (String(address.userId) !== String(userId)) throw errorHandler(403, 'Access denied');

  await address.deleteOne();

  if (address.isDefault) {
    const next = await BillingAddress.findOne({ userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  return { deleted: true };
}
