// Seeds a default superadmin and a default school admin.
// Idempotent: existing users are left untouched unless --force is passed,
// in which case their password / school / verification flags are reset.
//
//   npm run seed:admins
//   npm run seed:admins -- --force
//
// Credentials come from .env when present, otherwise the defaults below.

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../db/index.js';
import User from '../models/userModel.js';
import School from '../models/schoolModel.js';
import Department from '../models/departmentModel.js';

dotenv.config({ path: './.env' });

const force = process.argv.includes('--force');

const SUPERADMIN = {
  fullName: process.env.SEED_SUPERADMIN_NAME || 'Super Admin',
  email: process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@shikshyak.ai',
  password: process.env.SEED_SUPERADMIN_PASSWORD || 'SuperAdmin@123',
};

const ADMIN = {
  fullName: process.env.SEED_ADMIN_NAME || 'School Admin',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@shikshyak.ai',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
  designation: 'Administrator',
};

const HOD = {
  fullName: process.env.SEED_HOD_NAME || 'Department Head',
  email: process.env.SEED_HOD_EMAIL || 'hod@shikshyak.ai',
  password: process.env.SEED_HOD_PASSWORD || 'Hod@123',
  designation: 'Head of Department',
};

const SCHOOL_NAME = process.env.SEED_SCHOOL_NAME || 'Default School';
const DEPARTMENT_NAME = process.env.SEED_DEPARTMENT_NAME || 'Computer Engineering';

// Uses save() rather than findOneAndUpdate so the pre('save') bcrypt hook runs.
const upsertUser = async (email, fields) => {
  const existing = await User.findOne({ email });

  if (existing && !force) {
    console.log(`  skip   ${email} (already exists, role='${existing.role}')`);
    return existing;
  }

  if (existing) {
    Object.assign(existing, fields);
    await existing.save();
    console.log(`  reset  ${email} (role='${existing.role}')`);
    return existing;
  }

  const created = await User.create({ email, ...fields });
  console.log(`  create ${email} (role='${created.role}')`);
  return created;
};

const run = async () => {
  await connectDB();

  // Superadmin is platform-wide and intentionally has no school.
  console.log('Superadmin:');
  await upsertUser(SUPERADMIN.email, {
    fullName: SUPERADMIN.fullName,
    password: SUPERADMIN.password,
    role: 'superadmin',
    school: undefined,
    isEmailVerified: true,
    isBlocked: false,
  });

  // An admin is scoped to a school, so make sure one exists to attach to.
  console.log('School:');
  let school = await School.findOne({ name: SCHOOL_NAME });
  if (school) {
    console.log(`  skip   ${SCHOOL_NAME} (already exists)`);
  } else {
    school = await School.create({
      name: SCHOOL_NAME,
      type: 'college',
      isVerified: true,
      verifiedAt: new Date(),
    });
    console.log(`  create ${SCHOOL_NAME}`);
  }

  console.log('Admin:');
  await upsertUser(ADMIN.email, {
    fullName: ADMIN.fullName,
    password: ADMIN.password,
    role: 'admin',
    school: school._id,
    designation: ADMIN.designation,
    isEmailVerified: true,
    isBlocked: false,
  });

  // An HOD is scoped to a department, so create one for them to head.
  console.log('Department:');
  let department = await Department.findOne({ name: DEPARTMENT_NAME, school: school._id });
  if (department) {
    console.log(`  skip   ${DEPARTMENT_NAME} (already exists)`);
  } else {
    department = await Department.create({
      name: DEPARTMENT_NAME,
      school: school._id,
      description: 'Seeded default department',
    });
    console.log(`  create ${DEPARTMENT_NAME}`);
  }

  console.log('HOD:');
  const hod = await upsertUser(HOD.email, {
    fullName: HOD.fullName,
    password: HOD.password,
    role: 'hod',
    school: school._id,
    department: department._id,
    designation: HOD.designation,
    isEmailVerified: true,
    isBlocked: false,
  });

  // The link is two-way: the department has to point back at its head, or
  // department-scoped queries will not resolve the HOD.
  if (String(department.head || '') !== String(hod._id)) {
    department.head = hod._id;
    await department.save();
    console.log(`  link   ${DEPARTMENT_NAME} head -> ${HOD.email}`);
  }

  console.log('\nDone. Log in at POST /api/v1/auth/login with:');
  console.log(`  superadmin  ${SUPERADMIN.email} / ${SUPERADMIN.password}`);
  console.log(`  admin       ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`  hod         ${HOD.email} / ${HOD.password}`);
  console.log('\nChange these passwords before deploying.');

  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.connection.close();
  process.exit(1);
});
