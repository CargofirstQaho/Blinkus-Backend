import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../modules/auth/models/User.js';

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const result = await User.updateMany(
    { termsAcceptance: { $exists: false } },
    {
      $set: {
        termsAcceptance: {
          accepted:    false,
          acceptedAt:  null,
          version:     'v1.0',
          acceptedVia: null,
        },
      },
    }
  );

  console.log(`Migration complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
