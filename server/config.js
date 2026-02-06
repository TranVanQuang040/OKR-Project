// Default configuration helpers. Prefer setting values via environment variables.
// WARNING: Do NOT commit real secrets into this file for production.

const defaultAdmin = {
  email: process.env.ADMIN_EMAIL || 'admin@local',
  password: process.env.ADMIN_PASSWORD || 'admin1234',
  name: process.env.ADMIN_NAME || 'Quản trị hệ thống'
};

export default {
  defaultAdmin
};
