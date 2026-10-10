import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

// Single-document config — every deployment has exactly one row, always
// addressed by this fixed id rather than a lookup. Keeps "get the platform
// config" a trivial findById instead of a findOne-with-no-filter footgun.
export const SYSTEM_CONFIG_ID = 'singleton';

const systemConfigSchema = new Schema(
  {
    _id: { type: String, default: SYSTEM_CONFIG_ID },
    // Explicitly set true once the wizard completes — but "is setup done"
    // is actually `setupCompleted || an admin already exists`, so an older
    // deployment upgrading into this feature isn't stranded on the wizard
    // forever (see services/setup.service.ts#isSetupEffectivelyDone).
    setupCompleted: { type: Boolean, default: false },
    platformName: { type: String, default: 'Sentry', trim: true, maxlength: 60 },
    platformDescription: { type: String, default: '', trim: true, maxlength: 280 },
    registrationEnabled: { type: Boolean, default: true },
    // When true, a new registration lands as status PENDING instead of
    // ACTIVE and gets no tokens — an admin must approve/reject it (see
    // auth.service.ts#register, adminUser.service.ts#approveUser/rejectUser).
    registrationRequiresApproval: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    // Branding — URL fields, not a file-upload pipeline (an admin pastes a
    // link to an image they host elsewhere). All optional/nullable; a
    // deployment with none of these set just uses the built-in defaults.
    logoUrl: { type: String, default: null, trim: true, maxlength: 500 },
    faviconUrl: { type: String, default: null, trim: true, maxlength: 500 },
    accentColor: { type: String, default: null, trim: true, maxlength: 20 },
    bootMessage: { type: String, default: null, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

export type SystemConfigDoc = HydratedDocument<InferSchemaType<typeof systemConfigSchema>>;

export const SystemConfig = model('SystemConfig', systemConfigSchema);
