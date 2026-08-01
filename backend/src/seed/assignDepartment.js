// Assign a department to an existing user.
//
// Students who signed up before the department was captured at registration
// have no department on record. There is no stored signal for which one they
// chose, so this asks you rather than guessing.
//
//   node -r dotenv/config src/seed/assignDepartment.js --list
//   node -r dotenv/config src/seed/assignDepartment.js --email a@b.com --department "Software Engineering"
//   node -r dotenv/config src/seed/assignDepartment.js --all-missing --department "Software Engineering"
//
// --department accepts either a department name or its id.

import mongoose from 'mongoose';
import connectDB from '../db/index.js';
import User from '../models/userModel.js';
import Department from '../models/departmentModel.js';

const arg = (flag) => {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
};
const has = (flag) => process.argv.includes(flag);

const run = async () => {
  await connectDB();

  const departments = await Department.find().select('name school').lean();

  if (has('--list') || process.argv.length <= 2) {
    console.log('\nDepartments:');
    for (const d of departments) {
      console.log(`  ${d._id}  ${d.name}`);
    }

    const missing = await User.find({
      role: 'student',
      $or: [{ department: { $exists: false } }, { department: null }],
    }).select('fullName email school').lean();

    console.log(`\nStudents with no department (${missing.length}):`);
    for (const u of missing) {
      console.log(`  ${u.email}  ${u.fullName || ''}`);
    }
    console.log('\nAssign with --email <email> --department <name|id>');
    console.log('Or all at once with --all-missing --department <name|id>');
    await mongoose.connection.close();
    return;
  }

  const wanted = arg('--department');
  if (!wanted) {
    console.error('--department <name|id> is required');
    await mongoose.connection.close();
    process.exit(1);
  }

  const department =
    departments.find((d) => String(d._id) === wanted) ||
    departments.find((d) => d.name?.toLowerCase() === wanted.toLowerCase());

  if (!department) {
    console.error(`No department matching "${wanted}". Run --list to see them.`);
    await mongoose.connection.close();
    process.exit(1);
  }

  const email = arg('--email');
  const query = email
    ? { email }
    : has('--all-missing')
      ? { role: 'student', $or: [{ department: { $exists: false } }, { department: null }] }
      : null;

  if (!query) {
    console.error('Pass either --email <email> or --all-missing');
    await mongoose.connection.close();
    process.exit(1);
  }

  const targets = await User.find(query).select('email school department').lean();
  if (targets.length === 0) {
    console.log('No matching users.');
    await mongoose.connection.close();
    return;
  }

  let updated = 0;
  let skipped = 0;
  for (const user of targets) {
    // A department belongs to a school; assigning across schools would put the
    // user outside their own tenant.
    if (String(user.school) !== String(department.school)) {
      console.log(`  skip   ${user.email} (different school)`);
      skipped += 1;
      continue;
    }
    await User.updateOne({ _id: user._id }, { $set: { department: department._id } });
    console.log(`  set    ${user.email} -> ${department.name}`);
    updated += 1;
  }

  console.log(`\n${updated} updated, ${skipped} skipped.`);
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
