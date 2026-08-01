// Middleware to ensure the requesting user is either superadmin or belongs to the requested school
export const sameSchoolOrSuperAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ status: 'fail', message: 'You are not logged in' });
  if (req.user.role === 'superadmin') return next();
  // If user.school is an ObjectId, convert to string
  if (req.user.school && req.user.school.toString() === req.params.id) return next();
  return res.status(403).json({ status: 'fail', message: 'Forbidden' });
};
